(function () {
    const STORAGE_KEY = "coopairbus-products-v2";
    const SALES_STORAGE_KEY = "coopairbus-sales-v1";

    const DEFAULT_PRODUCTS = [
        {
            id: "cafe-unite",
            name: "Cafe Unite",
            category: "cafes",
            price: 0.5,
            stockShelf: 10,
            stockReserve: 20,
            image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80"
        },
        {
            id: "cafe-ramette",
            name: "Cafe Ramette",
            category: "cafes",
            price: 5,
            stockShelf: 10,
            stockReserve: 12,
            image: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80"
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

    function readProducts() {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return null;
        }

        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) {
                return null;
            }

            return parsed.map(normalizeProduct);
        } catch (error) {
            return null;
        }
    }

    function writeProducts(products) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products.map(normalizeProduct)));
    }

    function normalizeSaleItem(item) {
        return {
            id: String(item.id),
            name: String(item.name),
            qty: Math.max(0, Number(item.qty) || 0),
            price: Number(item.price) || 0
        };
    }

    function normalizeSaleEntry(entry) {
        const items = Array.isArray(entry.items) ? entry.items.map(normalizeSaleItem) : [];

        return {
            id: String(entry.id || `sale-${Date.now()}`),
            date: String(entry.date || new Date().toISOString().slice(0, 10)),
            createdAt: String(entry.createdAt || new Date().toISOString()),
            items,
            total: Number(entry.total) || items.reduce((sum, item) => sum + (item.qty * item.price), 0)
        };
    }

    function mergeWithDefaults(storedProducts) {
        const defaultProducts = DEFAULT_PRODUCTS.map(normalizeProduct);
        const mergedProducts = defaultProducts.map((defaultProduct) => {
            const storedProduct = storedProducts.find((product) => product.id === defaultProduct.id);

            if (!storedProduct) {
                return defaultProduct;
            }

            return normalizeProduct({
                ...defaultProduct,
                stockShelf: storedProduct.stockShelf,
                stockReserve: storedProduct.stockReserve
            });
        });

        const customProducts = storedProducts.filter((storedProduct) => {
            return !defaultProducts.some((defaultProduct) => defaultProduct.id === storedProduct.id);
        });

        return [...mergedProducts, ...customProducts];
    }

    function ensureProducts() {
        const storedProducts = readProducts();

        if (storedProducts && storedProducts.length > 0) {
            const mergedProducts = mergeWithDefaults(storedProducts);
            writeProducts(mergedProducts);
            return mergedProducts;
        }

        const defaults = DEFAULT_PRODUCTS.map(normalizeProduct);
        writeProducts(defaults);
        return defaults;
    }

    function getProducts() {
        return deepCopy(ensureProducts());
    }

    function saveProducts(products) {
        writeProducts(products);
        return getProducts();
    }

    function updateProduct(productId, updater) {
        const products = ensureProducts();
        const index = products.findIndex((product) => product.id === productId);

        if (index === -1) {
            return null;
        }

        const updatedProduct = normalizeProduct({
            ...products[index],
            ...updater(products[index])
        });

        products[index] = updatedProduct;
        writeProducts(products);
        return deepCopy(updatedProduct);
    }

    function changeStock(productId, changes) {
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

    function transferReserveToShelf(productId, quantity) {
        const amount = Math.max(0, Number(quantity) || 0);
        return changeStock(productId, {
            stockShelfDelta: amount,
            stockReserveDelta: -amount
        });
    }

    function transferShelfToReserve(productId, quantity) {
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

    function addProduct(product) {
        const products = ensureProducts();
        let nextId = slugify(product.name);

        while (products.some((item) => item.id === nextId)) {
            nextId = `${nextId}-${Math.floor(Math.random() * 1000)}`;
        }

        const newProduct = normalizeProduct({
            ...product,
            id: nextId
        });

        products.push(newProduct);
        writeProducts(products);
        return deepCopy(newProduct);
    }

    function deleteProduct(productId) {
        const products = ensureProducts();
        const filteredProducts = products.filter((product) => product.id !== productId);
        writeProducts(filteredProducts);
        return getProducts();
    }

    function readSales() {
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

    function writeSales(sales) {
        localStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(sales.map(normalizeSaleEntry)));
    }

    function getSales() {
        return deepCopy(readSales());
    }

    function recordSale(sale) {
        const sales = readSales();
        const newSale = normalizeSaleEntry({
            ...sale,
            id: `sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        });

        sales.push(newSale);
        writeSales(sales);
        return deepCopy(newSale);
    }

    function getSalesByDate(date) {
        return getSales().filter((sale) => sale.date === date);
    }

    window.CoopStockStore = {
        categories: [
            { id: "cafes", label: "Cafes" },
            { id: "boissons", label: "Boissons" },
            { id: "snacks", label: "Snacks" }
        ],
        storageKey: STORAGE_KEY,
        salesStorageKey: SALES_STORAGE_KEY,
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
        recordSale
    };
})();
