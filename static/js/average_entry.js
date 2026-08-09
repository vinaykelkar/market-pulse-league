document.addEventListener("DOMContentLoaded", function () {

    const instrument = document.getElementById("avgInstrument");
    const lotSizeField = document.querySelector(".avg-fno-field");
    const lotSizeInput = document.getElementById("avgLotSize");

    const rowsContainer = document.getElementById("averageEntryRows");
    const quantityHeading = document.getElementById("avgQuantityHeading");

    const addButton = document.getElementById("avgAddEntry");
    const calculateButton = document.getElementById("avgCalculate");
    const resetButton = document.getElementById("avgReset");

    const averagePriceResult = document.getElementById("avgPrice");
    const messageResult = document.getElementById("avgMessage");
    const totalQtyResult = document.getElementById("avgTotalQty");
    const totalLotsResult = document.getElementById("avgTotalLots");
    const totalValueResult = document.getElementById("avgTotalValue");
    const entriesUsedResult = document.getElementById("avgEntriesUsed");


    function formatMoney(value) {
        return "₹" + Number(value).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }


    function formatInteger(value) {
        return Number(value).toLocaleString("en-IN", {
            maximumFractionDigits: 0
        });
    }


    function updateInstrumentFields() {

        const isStock = instrument.value === "stocks";

        lotSizeField.style.display =
            isStock ? "none" : "";

        quantityHeading.textContent =
            isStock ? "Shares" : "Lots";


        document
            .querySelectorAll(".avg-quantity")
            .forEach(input => {

                input.placeholder =
                    isStock ? "Shares" : "Lots";
            });
    }


    instrument.addEventListener(
        "change",
        updateInstrumentFields
    );

    updateInstrumentFields();


    function createRow() {

        const row = document.createElement("div");

        row.className = "average-entry-row";

        const quantityPlaceholder =
            instrument.value === "stocks"
                ? "Shares"
                : "Lots";


        row.innerHTML = `
            <input
                type="number"
                class="avg-price"
                min="0"
                step="0.01"
                placeholder="Price"
            >

            <input
                type="number"
                class="avg-quantity"
                min="1"
                step="1"
                placeholder="${quantityPlaceholder}"
            >

            <button
                type="button"
                class="average-remove-row"
                aria-label="Remove entry"
            >
                ×
            </button>
        `;

        rowsContainer.appendChild(row);
    }


    addButton.addEventListener("click", createRow);


    rowsContainer.addEventListener("click", function (event) {

        if (
            !event.target.classList.contains(
                "average-remove-row"
            )
        ) {
            return;
        }


        const rows =
            rowsContainer.querySelectorAll(
                ".average-entry-row"
            );


        if (rows.length <= 2) {
            alert("Keep at least two entry rows.");
            return;
        }


        event.target
            .closest(".average-entry-row")
            .remove();
    });


    calculateButton.addEventListener("click", function () {

        const isStock =
            instrument.value === "stocks";


        let lotSize = 1;


        if (!isStock) {

            lotSize =
                parseInt(lotSizeInput.value, 10);

            if (
                !Number.isFinite(lotSize) ||
                lotSize <= 0
            ) {
                alert("Please enter a valid lot size.");
                return;
            }
        }


        const rows =
            rowsContainer.querySelectorAll(
                ".average-entry-row"
            );


        let totalPositionValue = 0;
        let totalQuantity = 0;
        let totalLots = 0;
        let entriesUsed = 0;


        rows.forEach(row => {

            const price =
                parseFloat(
                    row.querySelector(
                        ".avg-price"
                    ).value
                );


            const enteredQuantity =
                parseFloat(
                    row.querySelector(
                        ".avg-quantity"
                    ).value
                );


            if (
                Number.isFinite(price) &&
                Number.isFinite(enteredQuantity) &&
                price > 0 &&
                enteredQuantity > 0
            ) {

                let actualQuantity =
                    enteredQuantity;


                if (!isStock) {

                    totalLots += enteredQuantity;

                    actualQuantity =
                        enteredQuantity * lotSize;
                }


                totalPositionValue +=
                    price * actualQuantity;

                totalQuantity +=
                    actualQuantity;

                entriesUsed += 1;
            }
        });


        if (entriesUsed < 2) {
            alert("Please enter at least two valid entries.");
            return;
        }


        const averagePrice =
            totalPositionValue /
            totalQuantity;


        averagePriceResult.textContent =
            formatMoney(averagePrice);

        messageResult.textContent =
            "Weighted average entry price";


        totalQtyResult.textContent =
            formatInteger(totalQuantity);


        totalLotsResult.textContent =
            isStock
                ? "N/A"
                : formatInteger(totalLots);


        totalValueResult.textContent =
            formatMoney(totalPositionValue);


        entriesUsedResult.textContent =
            entriesUsed;
    });


    resetButton.addEventListener("click", function () {

        instrument.selectedIndex = 0;

        lotSizeInput.value = "";

        rowsContainer.innerHTML = "";

        createRow();
        createRow();

        updateInstrumentFields();

        averagePriceResult.textContent = "—";

        messageResult.textContent =
            "Enter at least two position entries.";

        totalQtyResult.textContent = "—";
        totalLotsResult.textContent = "—";
        totalValueResult.textContent = "—";
        entriesUsedResult.textContent = "—";
    });

});