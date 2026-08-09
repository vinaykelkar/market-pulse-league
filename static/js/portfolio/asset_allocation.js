document.addEventListener("DOMContentLoaded", function () {

    const modeButtons =
        document.querySelectorAll(".calculator-mode-btn");

    const emergencyFundInputs =
        document.getElementById("emergency-fund-inputs");

    const noEmergencyInfo =
        document.getElementById("no-emergency-info");

    const emergencyStatus =
        document.getElementById("emergency-status");

    const existingEmergencyWrapper =
        document.getElementById("existing-emergency-wrapper");

    const existingEmergencyInput =
        document.getElementById("existing-emergency-fund");

    const capitalInput =
        document.getElementById("allocation-capital");

    const monthlyExpensesInput =
        document.getElementById("monthly-expenses");

    const riskProfile =
        document.getElementById("risk-profile");

    const calculateButton =
        document.getElementById("calculate-allocation");

    const resetButton =
        document.getElementById("reset-allocation");

    const resultsSection =
        document.getElementById("allocation-results");

    const resultProfile =
        document.getElementById("result-profile");

    const resultTotalCapital =
        document.getElementById("result-total-capital");

    const resultEmergencyReserve =
        document.getElementById("result-emergency-reserve");

    const resultInvestableCapital =
        document.getElementById("result-investable-capital");

    const resultEmergencyCard =
        document.getElementById("result-emergency-card");

    const emergencyMessage =
        document.getElementById("emergency-result-message");

    const allocationTableWrapper =
        document.getElementById("allocation-table-wrapper");

    const allocationTableBody =
        document.getElementById("allocation-table-body");

    const explanationTitle =
        document.getElementById("allocation-explanation-title");

    const explanationText =
        document.getElementById("allocation-explanation-text");


    let currentMode = "with-ef";


    /*
     * Illustrative allocation percentages.
     * Each profile must total 100%.
     */

    const allocations = {

        conservative: {
            equity: 25,
            debt: 25,
            fd: 30,
            gold: 10,
            cash: 10
        },

        moderate: {
            equity: 50,
            debt: 20,
            fd: 15,
            gold: 10,
            cash: 5
        },

        aggressive: {
            equity: 70,
            debt: 10,
            fd: 5,
            gold: 10,
            cash: 5
        }

    };


    const profileDescriptions = {

        conservative:
            "A stability-focused allocation with a larger share in fixed deposits and debt-oriented assets while maintaining some equity exposure for long-term growth.",

        moderate:
            "A balanced allocation combining meaningful equity exposure for growth with debt, fixed deposits, gold and liquid assets for diversification and stability.",

        aggressive:
            "A growth-focused allocation with a high equity exposure while retaining smaller allocations to debt, fixed deposits, gold and liquid assets for diversification."

    };


    const assetLabels = {

        equity: "📈 Equity",
        debt: "🏦 Debt Funds",
        fd: "🏛️ Fixed Deposit",
        gold: "🥇 Gold",
        cash: "💵 Cash / Liquid"

    };


    function formatIndianCurrency(value) {

        return new Intl.NumberFormat(
            "en-IN",
            {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0
            }
        ).format(value);

    }


    function getProfileName(profile) {

        return (
            profile.charAt(0).toUpperCase() +
            profile.slice(1)
        );

    }


    function setMode(mode) {

        currentMode = mode;

        modeButtons.forEach(function (button) {

            const isActive =
                button.dataset.mode === mode;

            button.classList.toggle(
                "active",
                isActive
            );

            button.setAttribute(
                "aria-selected",
                isActive ? "true" : "false"
            );

        });


        if (mode === "with-ef") {

            emergencyFundInputs.hidden = false;
            noEmergencyInfo.hidden = true;

        } else {

            emergencyFundInputs.hidden = true;
            noEmergencyInfo.hidden = false;

        }


        resultsSection.hidden = true;

    }


    modeButtons.forEach(function (button) {

        button.addEventListener(
            "click",
            function () {

                setMode(
                    button.dataset.mode
                );

            }
        );

    });


    emergencyStatus.addEventListener(
        "change",
        function () {

            const isPartial =
                emergencyStatus.value === "partial";

            existingEmergencyWrapper.hidden =
                !isPartial;

            if (!isPartial) {

                existingEmergencyInput.value = "";

            }

        }
    );


    function calculateEmergencyFund(
        capital,
        monthlyExpenses
    ) {

        const status =
            emergencyStatus.value;

        const target =
            monthlyExpenses * 6;


        if (status === "full") {

            return {
                target: target,
                requiredFromCapital: 0,
                remainingCapital: capital,
                message: ""
            };

        }


        let existingFund = 0;


        if (status === "partial") {

            existingFund =
                Number(existingEmergencyInput.value);

            if (
                !Number.isFinite(existingFund) ||
                existingFund < 0
            ) {

                throw new Error(
                    "Please enter a valid current emergency fund amount."
                );

            }

        }


        const shortfall =
            Math.max(
                target - existingFund,
                0
            );


        const emergencyFromCapital =
            Math.min(
                shortfall,
                capital
            );


        const remainingCapital =
            Math.max(
                capital - emergencyFromCapital,
                0
            );


        let message = "";


        if (shortfall === 0) {

            message =
                "Your existing emergency reserve already meets the calculated six-month target.";

        } else if (capital < shortfall) {

            message =
                "Your emergency fund shortfall is " +
                formatIndianCurrency(shortfall) +
                ", which is greater than the capital currently available. " +
                "The full amount has therefore been reserved toward your emergency fund.";

        } else {

            message =
                formatIndianCurrency(emergencyFromCapital) +
                " has been reserved toward your emergency fund before allocating the remaining capital.";

        }


        return {
            target: target,
            requiredFromCapital:
                emergencyFromCapital,
            remainingCapital:
                remainingCapital,
            message: message
        };

    }


    function renderAllocation(
        investableCapital,
        profile
    ) {

        allocationTableBody.innerHTML = "";

        const profileAllocation =
            allocations[profile];


        Object.entries(
            profileAllocation
        ).forEach(
            function ([asset, percentage]) {

                const amount =
                    investableCapital *
                    (percentage / 100);


                const row =
                    document.createElement("tr");


                const assetCell =
                    document.createElement("td");

                assetCell.textContent =
                    assetLabels[asset];


                const percentageCell =
                    document.createElement("td");

                percentageCell.textContent =
                    percentage + "%";


                const amountCell =
                    document.createElement("td");

                amountCell.textContent =
                    formatIndianCurrency(amount);


                row.appendChild(assetCell);
                row.appendChild(percentageCell);
                row.appendChild(amountCell);

                allocationTableBody.appendChild(row);

            }
        );

    }


    calculateButton.addEventListener(
        "click",
        function () {

            try {

                const capital =
                    Number(capitalInput.value);

                const profile =
                    riskProfile.value;


                if (
                    !Number.isFinite(capital) ||
                    capital <= 0
                ) {

                    alert(
                        "Please enter a valid capital amount."
                    );

                    capitalInput.focus();

                    return;

                }


                let emergencyReserve = 0;
                let investableCapital = capital;
                let emergencyResult = null;


                if (currentMode === "with-ef") {

                    const monthlyExpenses =
                        Number(
                            monthlyExpensesInput.value
                        );


                    if (
                        !Number.isFinite(monthlyExpenses) ||
                        monthlyExpenses <= 0
                    ) {

                        alert(
                            "Please enter valid monthly essential expenses."
                        );

                        monthlyExpensesInput.focus();

                        return;

                    }


                    emergencyResult =
                        calculateEmergencyFund(
                            capital,
                            monthlyExpenses
                        );


                    emergencyReserve =
                        emergencyResult
                            .requiredFromCapital;


                    investableCapital =
                        emergencyResult
                            .remainingCapital;

                }


                const profileName =
                    getProfileName(profile);


                resultProfile.textContent =
                    profileName +
                    " Portfolio";


                explanationTitle.textContent =
                    profileName +
                    " Portfolio";


                explanationText.textContent =
                    profileDescriptions[profile];


                resultTotalCapital.textContent =
                    formatIndianCurrency(capital);


                resultEmergencyReserve.textContent =
                    formatIndianCurrency(
                        emergencyReserve
                    );


                resultInvestableCapital.textContent =
                    formatIndianCurrency(
                        investableCapital
                    );


                /*
                 * Hide emergency reserve KPI
                 * entirely for allocation-only mode.
                 */

                resultEmergencyCard.hidden =
                    currentMode === "without-ef";


                if (
                    emergencyResult &&
                    emergencyResult.message
                ) {

                    emergencyMessage.textContent =
                        emergencyResult.message;

                    emergencyMessage.hidden =
                        false;

                } else {

                    emergencyMessage.hidden =
                        true;

                }


                /*
                 * If emergency fund consumes
                 * the entire available capital,
                 * there is nothing left to allocate.
                 */

                if (investableCapital <= 0) {

                    allocationTableWrapper.hidden =
                        true;

                    explanationTitle.textContent =
                        "Emergency Reserve Priority";

                    explanationText.textContent =
                        "Based on the information entered, the available capital is required toward your emergency reserve. No amount remains for long-term asset allocation.";

                } else {

                    allocationTableWrapper.hidden =
                        false;

                    renderAllocation(
                        investableCapital,
                        profile
                    );

                }


                resultsSection.hidden = false;


                resultsSection.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            } catch (error) {

                alert(error.message);

            }

        }
    );


    resetButton.addEventListener(
        "click",
        function () {

            capitalInput.value = "";
            monthlyExpensesInput.value = "";
            existingEmergencyInput.value = "";

            emergencyStatus.value = "none";
            riskProfile.value = "moderate";

            existingEmergencyWrapper.hidden = true;

            resultsSection.hidden = true;

            setMode("with-ef");

        }
    );


});