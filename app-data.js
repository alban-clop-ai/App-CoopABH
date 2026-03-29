(function () {
    const STORAGE_KEY = "coopairbus-products-v2";
    const SALES_STORAGE_KEY = "coopairbus-sales-v1";
    const PRODUCTS_TABLE = "products";
    const SALES_TABLE = "sales";
    const SALE_ITEMS_TABLE = "sale_items";

    const DEFAULT_PRODUCTS = [
        {
            id: "cafe-unite",
            name: "Cafe",
            category: "cafes",
            price: 0.5,
            stockShelf: 20,
            stockReserve: 32,
            image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80"
        },
        {
            id: "coca-cola",
            name: "Coca-Cola",
            category: "boissons",
            price: 0.8,
            stockShelf: 10,
            stockReserve: 24,
            image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80"
        },
        {
            id: "oasis",
            name: "Oasis",
            category: "boissons",
            price: 0.8,
            stockShelf: 8,
            stockReserve: 18,
            image: "oasis.jpg"
        },
        {
            id: "perrier-1",
            name: "IceTea Green",
            category: "boissons",
            price: 0.8,
            stockShelf: 5,
            stockReserve: 15,
            image: "icetea-green.jpg"
        },
        {
            id: "ice-tea-green",
            name: "Coca-Cola Zero",
            category: "boissons",
            price: 0.8,
            stockShelf: 10,
            stockReserve: 14,
            image: "coca-cola-zero.jpg"
        },
        {
            id: "perrier-2",
            name: "Perrier",
            category: "boissons",
            price: 0.8,
            stockShelf: 5,
            stockReserve: 10,
            image: "perrier.jpg"
        },
        {
            id: "haribot",
            name: "Haribot",
            category: "snacks",
            price: 0.5,
            stockShelf: 5,
            stockReserve: 16,
            image: "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?auto=format&fit=crop&w=600&q=80"
        },
        {
            id: "bounti",
            name: "Bounti",
            category: "snacks",
            price: 0.5,
            stockShelf: 5,
            stockReserve: 12,
            image: "bounti.jpg"
        },
        {
            id: "snickes",
            name: "Snickes",
            category: "snacks",
            price: 0.5,
            stockShelf: 5,
            stockReserve: 12,
            image: "https://images.unsplash.com/photo-1584269600464-37b1b58a9fe7?auto=format&fit=crop&w=600&q=80"
        },
        {
            id: "mars",
            name: "Mars",
            category: "snacks",
            price: 0.5,
            stockShelf: 5,
            stockReserve: 12,
            image: "https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=600&q=80"
        },
        {
            id: "mms",
            name: "M&M's",
            category: "snacks",
            price: 0.5,
            stockShelf: 5,
            stockReserve: 10,
            image: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=600&q=80"
        }
    ];

    const categories = [
        { id: "cafes", label: "Cafes" },
        { id: "boissons", label: "Boissons" },
        { id: "snacks", label: "Snacks" }
    ];

    let initialized = false;
    let initPromise = null;
    let productsCache = [];
    let salesCache = [];
    let realtimeChannel = null;
    const listeners = new Set();

    function deepCopy(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function normalizeProduct(product) {
        return {
            id: String(product.id),
            name: String(product.name),
            category: String(product.category || "snacks"),
            price: Number(product.price) || 0,
            stockShelf: Math.max(0, Number(product.stockShelf) || 0),
            stockReserve: Math.max(0, Number(product.stockReserve) || 0),
            image: String(product.image || "")
        };
    }

    function migrateCafeProducts(products) {
        const baseCafe = products.find((product) => product.id === "cafe-unite");
        const rametteCafe = products.find((product) => product.id === "cafe-ramette");

        if (!baseCafe && !rametteCafe) {
            return products;
        }

        if (baseCafe && rametteCafe) {
            return products
                .filter((product) => product.id !== "cafe-ramette")
                .map((product) => {
                    if (product.id !== "cafe-unite") {
                        return product;
                    }

                    return normalizeProduct({
                        ...product,
                        name: "Cafe",
                        stockShelf: product.stockShelf + rametteCafe.stockShelf,
                        stockReserve: product.stockReserve + rametteCafe.stockReserve
                    });
                });
        }

        if (!baseCafe && rametteCafe) {
            const nextProducts = products.filter((product) => product.id !== "cafe-ramette");
            nextProducts.push(normalizeProduct({
                ...rametteCafe,
                id: "cafe-unite",
                name: "Cafe"
            }));
            return nextProducts;
        }

        return products.map((product) => {
            if (product.id !== "cafe-unite") {
                return product;
            }

            return normalizeProduct({
                ...product,
                name: "Cafe"
            });
        });
    }

    function normalizeSaleItem(item) {
        return {
            id: String(item.id),
            sourceProductId: String(item.sourceProductId || item.id),
            name: String(item.name),
            qty: Math.max(0, Number(item.qty) || 0),
            price: Number(item.price) || 0,
            stockStep: Math.max(1, Number(item.stockStep) || 1)
        };
    }

    function normalizeSaleEntry(entry) {
        const items = Array.isArray(entry.items) ? entry.items.map(normalizeSaleItem) : [];

        return {
            id: String(entry.id || `sale-${Date.now()}`),
            date: String(entry.date || new Date().toISOString().slice(0, 10)),
            createdAt: String(entry.createdAt || new Date().toISOString()),
            createdByEmail: String(entry.createdByEmail || ""),
            createdByLabel: String(entry.createdByLabel || ""),
            items,
            total: Number(entry.total) || items.reduce((sum, item) => sum + (item.qty * item.price), 0)
        };
    }

    function readProductsLocal() {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return null;
        }

        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return null;
            }

            return migrateCafeProducts(parsed.map(normalizeProduct));
        } catch (error) {
            return null;
        }
    }

    function writeProductsLocal(products) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products.map(normalizeProduct)));
    }

    function readSalesLocal() {
        const raw = localStorage.getItem(SALES_STORAGE_KEY);

        if (!raw) {
            return [];
        }

        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return [];
            }

            return parsed.map(normalizeSaleEntry);
        } catch (error) {
            return [];
        }
    }

    function writeSalesLocal(sales) {
        localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales.map(normalizeSaleEntry)));
    }

    function hasRemoteStore() {
        return Boolean(window.CoopAuth && window.CoopAuth.hasValidConfig());
    }

    function getClient() {
        return window.CoopAuth.getClient();
    }

    async function getCurrentUserLabel() {
        const session = await window.CoopAuth.getSession();
        const email = session?.user?.email || "";
        const metadataName = String(
            session?.user?.user_metadata?.full_name ||
            session?.user?.user_metadata?.name ||
            ""
        ).trim();

        return {
            email,
            label: metadataName || email.split("@")[0] || "Utilisateur"
        };
    }

    function getDefaultProducts() {
        return migrateCafeProducts(DEFAULT_PRODUCTS.map(normalizeProduct));
    }

    function toProductRow(product) {
        return {
            id: product.id,
            name: product.name,
            category: product.category,
            price: product.price,
            stock_shelf: product.stockShelf,
            stock_reserve: product.stockReserve,
            image: product.image
        };
    }

    function fromProductRow(row) {
        return normalizeProduct({
            id: row.id,
            name: row.name,
            category: row.category,
            price: row.price,
            stockShelf: row.stock_shelf,
            stockReserve: row.stock_reserve,
            image: row.image
        });
    }

    async function loadRemoteProducts() {
        const client = getClient();
        const { data, error } = await client
            .from(PRODUCTS_TABLE)
            .select("*")
            .order("category", { ascending: true })
            .order("name", { ascending: true });

        if (error) {
            throw error;
        }

        return migrateCafeProducts((data || []).map(fromProductRow));
    }

    async function loadRemoteSales() {
        const client = getClient();
        const { data, error } = await client
            .from(SALES_TABLE)
            .select("id, sale_date, created_at, total, created_by_email, created_by_label, sale_items(*)")
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        return (data || []).map((sale) => normalizeSaleEntry({
            id: sale.id,
            date: sale.sale_date,
            createdAt: sale.created_at,
            createdByEmail: sale.created_by_email,
            createdByLabel: sale.created_by_label,
            items: sale.sale_items || [],
            total: sale.total
        }));
    }

    async function ensureRemoteSeed() {
        const client = getClient();
        const { count, error } = await client
            .from(PRODUCTS_TABLE)
            .select("id", { count: "exact", head: true });

        if (error) {
            throw error;
        }

        if ((count || 0) > 0) {
            return;
        }

        const defaultRows = getDefaultProducts().map(toProductRow);
        const { error: insertError } = await client
            .from(PRODUCTS_TABLE)
            .upsert(defaultRows, { onConflict: "id" });

        if (insertError) {
            throw insertError;
        }
    }

    async function refreshRemoteData() {
        const [products, sales] = await Promise.all([
            loadRemoteProducts(),
            loadRemoteSales()
        ]);

        productsCache = products;
        salesCache = sales;
        writeProductsLocal(products);
        writeSalesLocal(sales);
    }

    function notifyListeners() {
        listeners.forEach((listener) => {
            try {
                listener();
            } catch (error) {
                console.error(error);
            }
        });
    }

    function setupRealtime() {
        if (!hasRemoteStore() || realtimeChannel) {
            return;
        }

        const client = getClient();
        realtimeChannel = client
            .channel("coopairbus-live-data")
            .on("postgres_changes", { event: "*", schema: "public", table: PRODUCTS_TABLE }, handleRealtimeChange)
            .on("postgres_changes", { event: "*", schema: "public", table: SALES_TABLE }, handleRealtimeChange)
            .on("postgres_changes", { event: "*", schema: "public", table: SALE_ITEMS_TABLE }, handleRealtimeChange)
            .subscribe();
    }

    async function handleRealtimeChange() {
        try {
            await refreshRemoteData();
            notifyListeners();
        } catch (error) {
            console.error(error);
        }
    }

    async function init() {
        if (initialized) {
            return;
        }

        if (initPromise) {
            return initPromise;
        }

        initPromise = (async () => {
            if (!hasRemoteStore()) {
                productsCache = readProductsLocal() || getDefaultProducts();
                salesCache = readSalesLocal();
                writeProductsLocal(productsCache);
                writeSalesLocal(salesCache);
                initialized = true;
                return;
            }

            await ensureRemoteSeed();
            await refreshRemoteData();
            setupRealtime();
            initialized = true;
        })();

        try {
            await initPromise;
        } finally {
            initPromise = null;
        }
    }

    async function getProducts() {
        await init();
        return deepCopy(productsCache);
    }

    async function getSales() {
        await init();
        return deepCopy(salesCache);
    }

    async function getSalesByDate(date) {
        const sales = await getSales();
        return sales.filter((sale) => sale.date === date);
    }

    async function saveProducts(products) {
        await init();

        if (!hasRemoteStore()) {
            productsCache = migrateCafeProducts(products.map(normalizeProduct));
            writeProductsLocal(productsCache);
            return getProducts();
        }

        const client = getClient();
        const rows = migrateCafeProducts(products.map(normalizeProduct)).map(toProductRow);
        const { error } = await client.from(PRODUCTS_TABLE).upsert(rows, { onConflict: "id" });

        if (error) {
            throw error;
        }

        await refreshRemoteData();
        return getProducts();
    }

    async function updateProduct(productId, updater) {
        await init();
        const currentProduct = productsCache.find((product) => product.id === productId);

        if (!currentProduct) {
            return null;
        }

        const updatedProduct = normalizeProduct({
            ...currentProduct,
            ...updater(currentProduct)
        });

        if (!hasRemoteStore()) {
            productsCache = productsCache.map((product) => product.id === productId ? updatedProduct : product);
            writeProductsLocal(productsCache);
            notifyListeners();
            return deepCopy(updatedProduct);
        }

        const client = getClient();
        const { error } = await client
            .from(PRODUCTS_TABLE)
            .update(toProductRow(updatedProduct))
            .eq("id", productId);

        if (error) {
            throw error;
        }

        await refreshRemoteData();
        notifyListeners();
        return deepCopy(updatedProduct);
    }

    async function changeStock(productId, changes) {
        await init();

        if (!hasRemoteStore()) {
            return updateProduct(productId, (product) => {
                const nextShelf = product.stockShelf + (changes.stockShelfDelta || 0);
                const nextReserve = product.stockReserve + (changes.stockReserveDelta || 0);

                if (nextShelf < 0 || nextReserve < 0) {
                    throw new Error("Stock insuffisant.");
                }

                return {
                    stockShelf: nextShelf,
                    stockReserve: nextReserve
                };
            });
        }

        const client = getClient();
        const { error } = await client.rpc("change_product_stock", {
            p_product_id: productId,
            p_stock_shelf_delta: Number(changes.stockShelfDelta || 0),
            p_stock_reserve_delta: Number(changes.stockReserveDelta || 0)
        });

        if (error) {
            throw error;
        }

        await refreshRemoteData();
        notifyListeners();
        return deepCopy(productsCache.find((product) => product.id === productId) || null);
    }

    async function transferReserveToShelf(productId, quantity) {
        const amount = Math.max(0, Number(quantity) || 0);
        return changeStock(productId, {
            stockShelfDelta: amount,
            stockReserveDelta: -amount
        });
    }

    async function transferShelfToReserve(productId, quantity) {
        const amount = Math.max(0, Number(quantity) || 0);
        return changeStock(productId, {
            stockShelfDelta: -amount,
            stockReserveDelta: amount
        });
    }

    function slugify(value) {
        return value
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 40) || `article-${Date.now()}`;
    }

    async function addProduct(product) {
        await init();
        const products = await getProducts();
        let nextId = slugify(product.name);

        while (products.some((item) => item.id === nextId)) {
            nextId = `${nextId}-${Math.floor(Math.random() * 1000)}`;
        }

        const newProduct = normalizeProduct({
            ...product,
            id: nextId
        });

        if (!hasRemoteStore()) {
            productsCache.push(newProduct);
            writeProductsLocal(productsCache);
            notifyListeners();
            return deepCopy(newProduct);
        }

        const client = getClient();
        const { error } = await client.from(PRODUCTS_TABLE).insert(toProductRow(newProduct));

        if (error) {
            throw error;
        }

        await refreshRemoteData();
        notifyListeners();
        return deepCopy(newProduct);
    }

    async function deleteProduct(productId) {
        await init();

        if (!hasRemoteStore()) {
            productsCache = productsCache.filter((product) => product.id !== productId);
            writeProductsLocal(productsCache);
            notifyListeners();
            return getProducts();
        }

        const client = getClient();
        const { error } = await client.from(PRODUCTS_TABLE).delete().eq("id", productId);

        if (error) {
            throw error;
        }

        await refreshRemoteData();
        notifyListeners();
        return getProducts();
    }

    async function recordSale(sale) {
        await init();
        const normalizedSale = normalizeSaleEntry({
            ...sale,
            id: sale.id || `sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        });

        if (!hasRemoteStore()) {
            salesCache.unshift(normalizedSale);
            writeSalesLocal(salesCache);
            notifyListeners();
            return deepCopy(normalizedSale);
        }

        const client = getClient();
        const user = await getCurrentUserLabel();
        const { data: saleRow, error: saleError } = await client
            .from(SALES_TABLE)
            .insert({
                sale_date: normalizedSale.date,
                created_at: normalizedSale.createdAt,
                total: normalizedSale.total,
                created_by_email: user.email,
                created_by_label: user.label
            })
            .select("id")
            .single();

        if (saleError) {
            throw saleError;
        }

        const itemRows = normalizedSale.items.map((item) => ({
            sale_id: saleRow.id,
            product_id: item.id,
            source_product_id: item.sourceProductId,
            name: item.name,
            qty: item.qty,
            price: item.price,
            stock_step: item.stockStep
        }));

        const { error: itemsError } = await client.from(SALE_ITEMS_TABLE).insert(itemRows);

        if (itemsError) {
            throw itemsError;
        }

        await refreshRemoteData();
        notifyListeners();
        return deepCopy(salesCache.find((entry) => entry.id === saleRow.id) || normalizedSale);
    }

    async function deleteSale(saleId) {
        await init();

        if (!hasRemoteStore()) {
            const saleToDelete = salesCache.find((sale) => sale.id === saleId);

            if (!saleToDelete) {
                throw new Error("Vente introuvable.");
            }

            for (const item of saleToDelete.items) {
                await changeStock(item.sourceProductId || item.id, {
                    stockShelfDelta: item.qty * item.stockStep
                });
            }

            salesCache = salesCache.filter((sale) => sale.id !== saleId);
            writeSalesLocal(salesCache);
            notifyListeners();
            return deepCopy(saleToDelete);
        }

        const client = getClient();
        const { error } = await client.rpc("delete_sale_and_restore_stock", {
            p_sale_id: saleId
        });

        if (error) {
            throw error;
        }

        await refreshRemoteData();
        notifyListeners();
        return true;
    }

    function subscribe(listener) {
        listeners.add(listener);

        return () => {
            listeners.delete(listener);
        };
    }

    window.CoopStockStore = {
        categories,
        storageKey: STORAGE_KEY,
        salesStorageKey: SALES_STORAGE_KEY,
        init,
        subscribe,
        getProducts,
        saveProducts,
        updateProduct,
        changeStock,
        transferReserveToShelf,
        transferShelfToReserve,
        addProduct,
        deleteProduct,
        getSales,
        getSalesByDate,
        recordSale,
        deleteSale
    };
})();
