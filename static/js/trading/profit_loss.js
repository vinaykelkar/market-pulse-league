document.addEventListener("DOMContentLoaded", function () {

    const instrument = document.getElementById("plInstrument");
    const direction = document.getElementById("plDirection");

    const stockField = document.querySelector(".pl-stock-field");
    const fnoField = document.querySelector(".pl-fno-field");

    const entryInput = document.getElementById("plEntry");
    const exitInput = document.getElementById("plExit");

    const sharesInput = document.getElementById("plShares");
    const lotSizeInput = document.getElementById("plLotSize");
    const lotsInput = document.getElementById("plLots");

    const calculateButton = document.getElementById("plCalculate");
    const resetButton = document.getElementById("plReset");

    const totalResult = document.getElementById("plTotal");
    const messageResult = document.getElementById("plMessage");
    const perUnitResult = document.getElementById("plPerUnit");
    const quantityResult = document.getElementById("plTotalQty");
    const movementResult = document.getElementById("plMove");
    const directionResult = document.getElementById("plDirectionResult");


    function formatMoney(value) {
        return "₹" + Number(value).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }


    function formatNumber(value) {
        return Number(value).toLocaleString("en-IN", {
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

        stockField.style.display = isStock ? "" : "none";
        fnoField.style.display = isStock ? "none" : "";
    }


    instrument.addEventListener("change", updateInstrumentFields);

    updateInstrumentFields();


    calculateButton.addEventListener("click", function () {

        const entry = parseFloat(entryInput.value);
        const exit = parseFloat(exitInput.value);

        if (
            !Number.isFinite(entry) ||
            !Number.isFinite(exit) ||
            entry <= 0 ||
            exit <= 0
        ) {
            alert("Please enter valid entry and exit prices.");
            return;
        }


        let quantity = 0;


        if (instrument.value === "stocks") {

            const shares = parseInt(sharesInput.value, 10);

            if (!Number.isFinite(shares) || shares <= 0) {
                alert("Please enter a valid number of shares.");
                return;
            }

            quantity = shares;

        } else {

            const lotSize = parseInt(lotSizeInput.value, 10);
            const lots = parseInt(lotsInput.value, 10);

            if (
                !Number.isFinite(lotSize) ||
                !Number.isFinite(lots) ||
                lotSize <= 0 ||
                lots <= 0
            ) {
                alert("Please enter a valid lot size and number of lots.");
                return;
            }

            quantity = lotSize * lots;
        }


        let pnlPerUnit;


        if (direction.value === "long") {
            pnlPerUnit = exit - entry;
        } else {
            pnlPerUnit = entry - exit;
        }


        const totalPnL = pnlPerUnit * quantity;
        const movementPercent =
            (pnlPerUnit / entry) * 100;


        totalResult.textContent =
            formatMoney(totalPnL);

        totalResult.classList.remove(
            "trade-positive",
            "trade-negative"
        );


        if (totalPnL > 0) {

            totalResult.classList.add("trade-positive");

            messageResult.textContent =
                "Gross profit on this trade.";

        } else if (totalPnL < 0) {

            totalResult.classList.add("trade-negative");

            messageResult.textContent =
                "Gross loss on this trade.";

        } else {

            messageResult.textContent =
                "The trade finished at break-even.";
        }


        perUnitResult.textContent =
            formatMoney(pnlPerUnit);

        quantityResult.textContent =
            formatInteger(quantity);

        movementResult.textContent =
            `${formatNumber(movementPercent)}%`;

        directionResult.textContent =
            direction.value === "long"
                ? "Long"
                : "Short";
    });


    resetButton.addEventListener("click", function () {

        instrument.selectedIndex = 0;
        direction.selectedIndex = 0;

        entryInput.value = "";
        exitInput.value = "";

        sharesInput.value = "";
        lotSizeInput.value = "";
        lotsInput.value = "";

        updateInstrumentFields();

        totalResult.textContent = "—";

        totalResult.classList.remove(
            "trade-positive",
            "trade-negative"
        );

        messageResult.textContent =
            "Enter your completed trade details.";

        perUnitResult.textContent = "—";
        quantityResult.textContent = "—";
        movementResult.textContent = "—";
        directionResult.textContent = "—";
    });

});