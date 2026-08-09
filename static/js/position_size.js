document.addEventListener("DOMContentLoaded", function () {

    const instrument = document.getElementById("psInstrument");
    const fnoField = document.querySelector(".ps-fno-field");

    const capitalInput = document.getElementById("psCapital");
    const riskPercentInput = document.getElementById("psRiskPercent");
    const entryInput = document.getElementById("psEntry");
    const stopInput = document.getElementById("psStop");
    const lotSizeInput = document.getElementById("psLotSize");

    const calculateButton = document.getElementById("psCalculate");
    const resetButton = document.getElementById("psReset");

    const primaryResult = document.getElementById("psPrimary");
    const primaryLabel = document.getElementById("psPrimaryLabel");
    const riskAmountResult = document.getElementById("psRiskAmount");
    const riskUnitResult = document.getElementById("psRiskUnit");
    const totalQtyResult = document.getElementById("psTotalQty");
    const positionValueResult = document.getElementById("psPositionValue");


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

        if (instrument.value === "stocks") {
            fnoField.style.display = "none";
        } else {
            fnoField.style.display = "";
        }
    }


    instrument.addEventListener("change", updateInstrumentFields);

    updateInstrumentFields();


    calculateButton.addEventListener("click", function () {

        const capital = parseFloat(capitalInput.value);
        const riskPercent = parseFloat(riskPercentInput.value);
        const entry = parseFloat(entryInput.value);
        const stop = parseFloat(stopInput.value);

        if (
            !Number.isFinite(capital) ||
            !Number.isFinite(riskPercent) ||
            !Number.isFinite(entry) ||
            !Number.isFinite(stop) ||
            capital <= 0 ||
            riskPercent <= 0 ||
            entry <= 0 ||
            stop <= 0
        ) {
            alert("Please enter valid positive values.");
            return;
        }


        const maximumRisk = capital * (riskPercent / 100);
        const riskPerUnit = Math.abs(entry - stop);


        if (riskPerUnit === 0) {
            alert("Entry price and stop loss cannot be the same.");
            return;
        }


        const rawQuantity = Math.floor(maximumRisk / riskPerUnit);

        let totalQuantity = rawQuantity;
        let resultText = "";
        let resultLabel = "";


        if (instrument.value === "stocks") {

            resultText = `${formatInteger(rawQuantity)} Shares`;

            resultLabel =
                "Maximum shares based on your defined risk.";

        } else {

            const lotSize = parseInt(lotSizeInput.value, 10);

            if (!Number.isFinite(lotSize) || lotSize <= 0) {
                alert("Please enter a valid lot size.");
                return;
            }


            const lots = Math.floor(rawQuantity / lotSize);

            totalQuantity = lots * lotSize;

            resultText =
                `${formatInteger(lots)} ${lots === 1 ? "Lot" : "Lots"}`;

            resultLabel =
                `${formatInteger(totalQuantity)} total units`;
        }


        const actualRisk = totalQuantity * riskPerUnit;
        const positionValue = totalQuantity * entry;


        primaryResult.textContent = resultText;
        primaryLabel.textContent = resultLabel;

        riskAmountResult.textContent = formatMoney(actualRisk);
        riskUnitResult.textContent = formatMoney(riskPerUnit);
        totalQtyResult.textContent = formatInteger(totalQuantity);
        positionValueResult.textContent = formatMoney(positionValue);
    });


    resetButton.addEventListener("click", function () {

        capitalInput.value = "";
        riskPercentInput.value = "";
        entryInput.value = "";
        stopInput.value = "";
        lotSizeInput.value = "";

        instrument.selectedIndex = 0;

        updateInstrumentFields();

        primaryResult.textContent = "—";
        primaryLabel.textContent =
            "Enter your trade details to calculate.";

        riskAmountResult.textContent = "—";
        riskUnitResult.textContent = "—";
        totalQtyResult.textContent = "—";
        positionValueResult.textContent = "—";
    });

});