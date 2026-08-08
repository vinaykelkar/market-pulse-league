(() => {

    "use strict";


    const MAX_YEARS = 100;


    let selectedGoal = {
        name: "Education",
        icon: "🎓"
    };



    /* =========================================================
       COMMON HELPERS
    ========================================================= */

    function byId(id) {

        return document.getElementById(id);

    }


    function parseNumber(id) {

        return Number.parseFloat(
            byId(id).value
        );

    }


    function formatINR(value) {

        return new Intl.NumberFormat(
            "en-IN",
            {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 0
            }
        ).format(
            Math.round(value)
        );

    }


    function formatCompactINR(value) {

        return new Intl.NumberFormat(
            "en-IN",
            {
                style: "currency",
                currency: "INR",
                notation: "compact",
                maximumFractionDigits: 2
            }
        ).format(value);

    }


    function setError(
        id,
        message = ""
    ) {

        byId(id).textContent =
            message;

    }



    /* =========================================================
       VALIDATION
    ========================================================= */

    function validatePositive(
        value,
        label
    ) {

        if (
            !Number.isFinite(value)
        ) {

            return `${label} must be a valid number.`;

        }


        if (
            value <= 0
        ) {

            return `${label} must be greater than zero.`;

        }


        return "";

    }



    function validateInflation(
        rate
    ) {

        if (
            !Number.isFinite(rate)
        ) {

            return "Inflation rate must be a valid number.";

        }


        if (
            rate < 0 ||
            rate > 100
        ) {

            return "Inflation rate must be between 0% and 100%.";

        }


        return "";

    }



    function validateYears(
        years
    ) {

        if (
            !Number.isFinite(years)
        ) {

            return "Number of years must be a valid number.";

        }


        if (
            years <= 0 ||
            years > MAX_YEARS
        ) {

            return (
                `Number of years must be greater than 0 ` +
                `and no more than ${MAX_YEARS}.`
            );

        }


        return "";

    }



    /* =========================================================
       TAB NAVIGATION
    ========================================================= */

    function initialiseTabs() {

        const tabs =
            document.querySelectorAll(
                ".inflation-tab"
            );


        const panels =
            document.querySelectorAll(
                ".inflation-panel"
            );


        tabs.forEach(
            (tab) => {

                tab.addEventListener(
                    "click",
                    () => {

                        const targetId =
                            tab.dataset.target;


                        tabs.forEach(
                            (item) => {

                                const isActive =
                                    item === tab;


                                item.classList.toggle(
                                    "active",
                                    isActive
                                );


                                item.setAttribute(
                                    "aria-selected",
                                    String(isActive)
                                );

                            }
                        );


                        panels.forEach(
                            (panel) => {

                                const isActive =
                                    panel.id === targetId;


                                panel.classList.toggle(
                                    "active",
                                    isActive
                                );


                                panel.hidden =
                                    !isActive;

                            }
                        );

                    }
                );

            }
        );

    }



    /* =========================================================
       GOAL SELECTOR
    ========================================================= */

    function initialiseGoalSelector() {

        const goalButtons =
            document.querySelectorAll(
                ".inflation-goal-btn"
            );


        goalButtons.forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {

                        goalButtons.forEach(
                            (item) => {

                                item.classList.remove(
                                    "active"
                                );

                            }
                        );


                        button.classList.add(
                            "active"
                        );


                        selectedGoal = {

                            name:
                                button.dataset.goal,

                            icon:
                                button.dataset.icon

                        };


                        calculateFutureGoal();

                    }
                );

            }
        );

    }



    /* =========================================================
       1. FUTURE GOAL COST
    ========================================================= */

    function calculateFutureGoal() {

        const currentCost =
            parseNumber(
                "goalCurrentCost"
            );


        const inflationRate =
            parseNumber(
                "goalInflationRate"
            );


        const years =
            parseNumber(
                "goalYears"
            );


        setError(
            "goalError"
        );



        const costError =
            validatePositive(
                currentCost,
                "Today's cost"
            );


        const inflationError =
            validateInflation(
                inflationRate
            );


        const yearsError =
            validateYears(
                years
            );


        const validationError =
            costError ||
            inflationError ||
            yearsError;


        if (
            validationError
        ) {

            setError(
                "goalError",
                validationError
            );

            return;

        }



        /* -----------------------------------------------------
           FUTURE COST FORMULA

           Future Cost =
           Current Cost × (1 + Inflation Rate)^Years
        ----------------------------------------------------- */

        const inflationDecimal =
            inflationRate /
            100;


        const futureCost =
            currentCost *
            Math.pow(
                1 + inflationDecimal,
                years
            );



        const additionalCost =
            futureCost -
            currentCost;



        const costIncreasePercent =
            (
                additionalCost /
                currentCost
            ) * 100;



        /* -----------------------------------------------------
           DISPLAY RESULTS
        ----------------------------------------------------- */

        byId(
            "goalFutureCost"
        ).textContent =
            formatINR(
                futureCost
            );


        byId(
            "goalOriginalCost"
        ).textContent =
            formatINR(
                currentCost
            );


        byId(
            "goalAdditionalCost"
        ).textContent =
            formatINR(
                additionalCost
            );


        byId(
            "goalCostIncrease"
        ).textContent =
            `${costIncreasePercent.toFixed(2)}%`;



        /* -----------------------------------------------------
           SIMPLE HUMAN EXPLANATION
        ----------------------------------------------------- */

        byId(
            "goalExplanation"
        ).innerHTML =
            `
                <span class="inflation-explanation-icon">
                    ${selectedGoal.icon}
                </span>

                <p>
                    A ${selectedGoal.name.toLowerCase()} goal costing
                    <strong>${formatCompactINR(currentCost)}</strong>
                    today may require approximately
                    <strong>${formatCompactINR(futureCost)}</strong>
                    after
                    <strong>${years} ${years === 1 ? "year" : "years"}</strong>
                    at
                    <strong>${inflationRate}% inflation</strong>.
                </p>
            `;

    }



    /* =========================================================
       2. PURCHASING POWER
    ========================================================= */

    function calculatePurchasingPower() {

        const futureAmount =
            parseNumber(
                "powerFutureAmount"
            );


        const inflationRate =
            parseNumber(
                "powerInflationRate"
            );


        const years =
            parseNumber(
                "powerYears"
            );


        setError(
            "powerError"
        );



        const amountError =
            validatePositive(
                futureAmount,
                "Future amount"
            );


        const inflationError =
            validateInflation(
                inflationRate
            );


        const yearsError =
            validateYears(
                years
            );


        const validationError =
            amountError ||
            inflationError ||
            yearsError;


        if (
            validationError
        ) {

            setError(
                "powerError",
                validationError
            );

            return;

        }



        /* -----------------------------------------------------
           PURCHASING POWER FORMULA

           Today's Value =
           Future Amount /
           (1 + Inflation Rate)^Years
        ----------------------------------------------------- */

        const inflationDecimal =
            inflationRate /
            100;


        const todayValue =
            futureAmount /
            Math.pow(
                1 + inflationDecimal,
                years
            );



        const purchasingPowerLost =
            futureAmount -
            todayValue;



        const purchasingPowerLossPercent =
            (
                purchasingPowerLost /
                futureAmount
            ) * 100;



        /* -----------------------------------------------------
           DISPLAY RESULTS
        ----------------------------------------------------- */

        byId(
            "powerTodayValue"
        ).textContent =
            formatINR(
                todayValue
            );


        byId(
            "powerOriginalAmount"
        ).textContent =
            formatINR(
                futureAmount
            );


        byId(
            "powerLostAmount"
        ).textContent =
            formatINR(
                purchasingPowerLost
            );


        byId(
            "powerLossPercent"
        ).textContent =
            `${purchasingPowerLossPercent.toFixed(2)}%`;



        /* -----------------------------------------------------
           SIMPLE EXPLANATION
        ----------------------------------------------------- */

        byId(
            "powerExplanation"
        ).innerHTML =
            `
                <span class="inflation-explanation-icon">
                    💸
                </span>

                <p>
                    <strong>${formatCompactINR(futureAmount)}</strong>
                    received
                    <strong>${years} ${years === 1 ? "year" : "years"}</strong>
                    from now may have purchasing power similar to about
                    <strong>${formatCompactINR(todayValue)}</strong>
                    in today's money at
                    <strong>${inflationRate}% inflation</strong>.
                </p>
            `;

    }



    /* =========================================================
       BUTTON EVENTS
    ========================================================= */

    function bindCalculatorEvents() {

        byId(
            "goalCalculateBtn"
        ).addEventListener(
            "click",
            calculateFutureGoal
        );


        byId(
            "powerCalculateBtn"
        ).addEventListener(
            "click",
            calculatePurchasingPower
        );



        /* -----------------------------------------------------
           ENTER KEY SUPPORT
        ----------------------------------------------------- */

        const enterBindings = [

            [
                "goalCurrentCost",
                calculateFutureGoal
            ],

            [
                "goalInflationRate",
                calculateFutureGoal
            ],

            [
                "goalYears",
                calculateFutureGoal
            ],

            [
                "powerFutureAmount",
                calculatePurchasingPower
            ],

            [
                "powerInflationRate",
                calculatePurchasingPower
            ],

            [
                "powerYears",
                calculatePurchasingPower
            ]

        ];



        enterBindings.forEach(
            ([id, handler]) => {

                byId(
                    id
                ).addEventListener(
                    "keydown",
                    (event) => {

                        if (
                            event.key ===
                            "Enter"
                        ) {

                            handler();

                        }

                    }
                );

            }
        );

    }



    /* =========================================================
       INITIALISE PAGE
    ========================================================= */

    function initialise() {

        initialiseTabs();

        initialiseGoalSelector();

        bindCalculatorEvents();


        calculateFutureGoal();

        calculatePurchasingPower();

    }



    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialise
        );

    } else {

        initialise();

    }

})();