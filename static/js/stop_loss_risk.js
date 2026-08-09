document.addEventListener("DOMContentLoaded", function () {

    const instrument = document.getElementById("slInstrument");

    const stockField = document.querySelector(".sl-stock-field");
    const fnoField = document.querySelector(".sl-fno-field");

    const capitalInput = document.getElementById("slCapital");
    const entryInput = document.getElementById("slEntry");
    const stopInput = document.getElementById("slStop");

    const sharesInput = document.getElementById("slShares");
    const lotSizeInput = document.getElementById("slLotSize");
    const lotsInput = document.getElementById("slLots");

    const calculateButton = document.getElementById("slCalculate");
    const resetButton = document.getElementById("slReset");

    const totalRiskResult = document.getElementById("slTotalRisk");
    const riskMessage = document.getElementById("slRiskMessage");
    const riskUnitResult = document.getElementById("slRiskUnit");
    const totalQtyResult = document.getElementById("slTotalQty");
    const capitalRiskResult = document.getElementById("slCapitalRisk");
    const stopPercentResult = document.getElementById("slStopPercent");


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

        const capital = parseFloat(capitalInput.value);
        const entry = parseFloat(entryInput.value);
        const stop = parseFloat(stopInput.value);

        if (
            !Number.isFinite(capital) ||
            !Number.isFinite(entry) ||
            !Number.isFinite(stop) ||
            capital <= 0 ||
            entry <= 0 ||
            stop <= 0
        ) {
            alert("Please enter valid capital, entry and stop loss values.");
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


        const riskPerUnit = Math.abs(entry - stop);
        const totalRisk = riskPerUnit * quantity;

        const riskPercentOfCapital =
            (totalRisk / capital) * 100;

        const stopDistancePercent =
            (riskPerUnit / entry) * 100;


        totalRiskResult.textContent = formatMoney(totalRisk);

        riskMessage.textContent =
            `${formatNumber(riskPercentOfCapital)}% of your trading capital`;

        riskUnitResult.textContent = formatMoney(riskPerUnit);
        totalQtyResult.textContent = formatInteger(quantity);

        capitalRiskResult.textContent =
            `${formatNumber(riskPercentOfCapital)}%`;

        stopPercentResult.textContent =
            `${formatNumber(stopDistancePercent)}%`;
    });


    resetButton.addEventListener("click", function () {

        capitalInput.value = "";
        entryInput.value = "";
        stopInput.value = "";

        sharesInput.value = "";
        lotSizeInput.value = "";
        lotsInput.value = "";

        instrument.selectedIndex = 0;

        updateInstrumentFields();

        totalRiskResult.textContent = "—";
        riskMessage.textContent =
            "Enter your position details to calculate.";

        riskUnitResult.textContent = "—";
        totalQtyResult.textContent = "—";
        capitalRiskResult.textContent = "—";
        stopPercentResult.textContent = "—";
    });

});