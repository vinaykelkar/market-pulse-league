document.addEventListener("DOMContentLoaded", function () {

    const instrument =
        document.getElementById("avgInstrument");

    const lotSizeField =
        document.getElementById("avgLotSizeField");

    const lotSizeInput =
        document.getElementById("avgLotSize");

    const quantityHeading =
        document.getElementById("avgQuantityHeading");

    const rowsContainer =
        document.getElementById("averageEntryRows");

    const addButton =
        document.getElementById("avgAddEntry");

    const calculateButton =
        document.getElementById("avgCalculate");

    const resetButton =
        document.getElementById("avgReset");


    const averagePriceResult =
        document.getElementById("avgPrice");

    const messageResult =
        document.getElementById("avgMessage");

    const totalQtyResult =
        document.getElementById("avgTotalQty");

    const totalLotsResult =
        document.getElementById("avgTotalLots");

    const totalValueResult =
        document.getElementById("avgTotalValue");

    const entriesUsedResult =
        document.getElementById("avgEntriesUsed");

    const lotsResultLabel =
        document.getElementById("avgLotsResultLabel");


    /* =====================================================
       FORMATTERS
    ===================================================== */

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


    /* =====================================================
       INSTRUMENT SWITCHING
    ===================================================== */

    function updateInstrumentUI() {

        const isStock =
            instrument.value === "stocks";


        if (isStock) {

            lotSizeField.style.display = "none";

            quantityHeading.textContent =
                "Shares";

            lotsResultLabel.textContent =
                "Quantity Type";

            totalLotsResult.textContent =
                "Shares";

        }

        else {

            lotSizeField.style.display = "";

            quantityHeading.textContent =
                "Lots";

            lotsResultLabel.textContent =
                "Total Lots";

            totalLotsResult.textContent =
                "—";

        }


        document
            .querySelectorAll(".avg-quantity")
            .forEach(function (input) {

                input.placeholder =
                    isStock
                        ? "Shares"
                        : "Lots";

            });

    }


    instrument.addEventListener(
        "change",
        function () {

            updateInstrumentUI();

        }
    );


    /* Run immediately on page load */

    updateInstrumentUI();


    /* =====================================================
       CREATE ENTRY ROW
    ===================================================== */

    function createRow() {

        const quantityPlaceholder =
            instrument.value === "stocks"
                ? "Shares"
                : "Lots";


        const row =
            document.createElement("div");


        row.className =
            "average-entry-row";


        row.innerHTML = `
            <input
                type="number"
                class="avg-price"
                min="0.01"
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


    addButton.addEventListener(
        "click",
        createRow
    );


    /* =====================================================
       REMOVE ENTRY ROW
    ===================================================== */

    rowsContainer.addEventListener(
        "click",
        function (event) {

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

                alert(
                    "Keep at least two entry rows."
                );

                return;

            }


            event.target
                .closest(".average-entry-row")
                .remove();

        }
    );


    /* =====================================================
       CALCULATE
    ===================================================== */

    calculateButton.addEventListener(
        "click",
        function () {

            const isStock =
                instrument.value === "stocks";


            let lotSize = 1;


            if (!isStock) {

                lotSize =
                    parseInt(
                        lotSizeInput.value,
                        10
                    );


                if (
                    !Number.isFinite(lotSize) ||
                    lotSize <= 0
                ) {

                    alert(
                        "Please enter a valid lot size."
                    );

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


            rows.forEach(function (row) {

                const price =
                    parseFloat(
                        row.querySelector(
                            ".avg-price"
                        ).value
                    );


                const enteredQuantity =
                    parseInt(
                        row.querySelector(
                            ".avg-quantity"
                        ).value,
                        10
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

                        totalLots +=
                            enteredQuantity;


                        actualQuantity =
                            enteredQuantity *
                            lotSize;

                    }


                    totalPositionValue +=
                        price *
                        actualQuantity;


                    totalQuantity +=
                        actualQuantity;


                    entriesUsed += 1;

                }

            });


            if (entriesUsed < 2) {

                alert(
                    "Please enter at least two valid entries."
                );

                return;

            }


            const averagePrice =
                totalPositionValue /
                totalQuantity;


            averagePriceResult.textContent =
                formatMoney(
                    averagePrice
                );


            messageResult.textContent =
                "Weighted average entry price";


            totalQtyResult.textContent =
                formatInteger(
                    totalQuantity
                );


            if (isStock) {

                lotsResultLabel.textContent =
                    "Quantity Type";

                totalLotsResult.textContent =
                    "Shares";

            }

            else {

                lotsResultLabel.textContent =
                    "Total Lots";

                totalLotsResult.textContent =
                    formatInteger(
                        totalLots
                    );

            }


            totalValueResult.textContent =
                formatMoney(
                    totalPositionValue
                );


            entriesUsedResult.textContent =
                entriesUsed;

        }
    );


    /* =====================================================
       RESET
    ===================================================== */

    resetButton.addEventListener(
        "click",
        function () {

            instrument.value =
                "stocks";


            lotSizeInput.value =
                "";


            rowsContainer.innerHTML =
                "";


            createRow();
            createRow();


            updateInstrumentUI();


            averagePriceResult.textContent =
                "—";


            messageResult.textContent =
                "Enter at least two position entries.";


            totalQtyResult.textContent =
                "—";


            lotsResultLabel.textContent =
                "Quantity Type";


            totalLotsResult.textContent =
                "Shares";


            totalValueResult.textContent =
                "—";


            entriesUsedResult.textContent =
                "—";

        }
    );

});