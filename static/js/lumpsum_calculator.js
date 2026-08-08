(() => {

    "use strict";


    const MAX_YEARS = 100;



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


    function setError(
        id,
        message = ""
    ) {

        byId(id).textContent =
            message;

    }



    /* =========================================================
       FINANCIAL FUNCTIONS
    ========================================================= */


    /*
     * Future Value of Lumpsum
     *
     * FV = P × (1 + r)^n
     *
     * P = initial investment
     * r = annual return
     * n = years
     */

    function calculateFutureValue(
        principal,
        annualReturn,
        years
    ) {

        const rate =
            annualReturn / 100;


        return (
            principal *
            Math.pow(
                1 + rate,
                years
            )
        );

    }



    /*
     * CAGR
     *
     * CAGR =
     * (Final / Initial)^(1 / Years) - 1
     */

    function calculateCAGR(
        initialValue,
        finalValue,
        years
    ) {

        return (
            Math.pow(
                finalValue /
                initialValue,
                1 / years
            ) - 1
        ) * 100;

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

            return (
                `${label} must be a valid number.`
            );

        }


        if (
            value <= 0
        ) {

            return (
                `${label} must be greater than zero.`
            );

        }


        return "";

    }



    function validateYears(
        years
    ) {

        if (
            !Number.isFinite(years)
        ) {

            return (
                "Investment period must be a valid number."
            );

        }


        if (
            years <= 0 ||
            years > MAX_YEARS
        ) {

            return (
                `Investment period must be greater than 0 ` +
                `and no more than ${MAX_YEARS} years.`
            );

        }


        return "";

    }



    function validateExpectedReturn(
        rate
    ) {

        if (
            !Number.isFinite(rate)
        ) {

            return (
                "Expected annual return must be a valid number."
            );

        }


        if (
            rate < 0 ||
            rate > 100
        ) {

            return (
                "Expected annual return must be between 0% and 100%."
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
                ".lumpsum-tab"
            );


        const panels =
            document.querySelectorAll(
                ".lumpsum-panel"
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
                                    panel.id ===
                                    targetId;


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
       1. BASIC LUMPSUM CALCULATOR
    ========================================================= */

    function calculateBasicLumpsum() {

        const principal =
            parseNumber(
                "basicLumpsumAmount"
            );


        const annualReturn =
            parseNumber(
                "basicLumpsumReturn"
            );


        const years =
            parseNumber(
                "basicLumpsumYears"
            );


        setError(
            "basicLumpsumError"
        );



        const principalError =
            validatePositive(
                principal,
                "Investment amount"
            );


        const returnError =
            validateExpectedReturn(
                annualReturn
            );


        const yearsError =
            validateYears(
                years
            );


        const validationError =
            principalError ||
            returnError ||
            yearsError;


        if (
            validationError
        ) {

            setError(
                "basicLumpsumError",
                validationError
            );

            return;

        }



        const corpus =
            calculateFutureValue(
                principal,
                annualReturn,
                years
            );


        const gain =
            corpus -
            principal;


        const multiple =
            corpus /
            principal;



        byId(
            "basicLumpsumCorpus"
        ).textContent =
            formatINR(
                corpus
            );


        byId(
            "basicLumpsumInvested"
        ).textContent =
            formatINR(
                principal
            );


        byId(
            "basicLumpsumGain"
        ).textContent =
            formatINR(
                gain
            );


        byId(
            "basicLumpsumMultiple"
        ).textContent =
            `${multiple.toFixed(2)}×`;

    }



    /* =========================================================
       2. LUMPSUM DURATION CALCULATOR
    ========================================================= */

    function calculateLumpsumDuration() {

        const principal =
            parseNumber(
                "durationLumpsumAmount"
            );


        const annualReturn =
            parseNumber(
                "durationLumpsumReturn"
            );


        const target =
            parseNumber(
                "durationLumpsumGoal"
            );


        setError(
            "durationLumpsumError"
        );



        const principalError =
            validatePositive(
                principal,
                "Investment amount"
            );


        const targetError =
            validatePositive(
                target,
                "Target corpus"
            );


        if (
            principalError ||
            targetError
        ) {

            setError(
                "durationLumpsumError",
                principalError ||
                targetError
            );

            return;

        }



        /*
         * If the target has already been reached,
         * duration is zero.
         */

        if (
            target <= principal
        ) {

            byId(
                "durationLumpsumTime"
            ).textContent =
                "Already Reached";


            byId(
                "durationLumpsumInvested"
            ).textContent =
                formatINR(
                    principal
                );


            byId(
                "durationLumpsumTarget"
            ).textContent =
                formatINR(
                    target
                );


            byId(
                "durationLumpsumGain"
            ).textContent =
                formatINR(
                    target -
                    principal
                );


            return;

        }



        /*
         * Positive return is necessary if the
         * target is higher than the principal.
         */

        if (
            !Number.isFinite(
                annualReturn
            ) ||
            annualReturn <= 0 ||
            annualReturn > 100
        ) {

            setError(
                "durationLumpsumError",
                "Expected annual return must be greater than 0% and no more than 100%."
            );

            return;

        }



        /*
         * Formula:
         *
         * Target =
         * Principal × (1 + r)^n
         *
         * Therefore:
         *
         * n =
         * log(Target / Principal)
         * /
         * log(1 + r)
         */

        const rate =
            annualReturn /
            100;


        const years =
            Math.log(
                target /
                principal
            ) /
            Math.log(
                1 + rate
            );



        if (
            years >
            MAX_YEARS
        ) {

            setError(
                "durationLumpsumError",
                `Target requires more than ${MAX_YEARS} years using these assumptions.`
            );

            return;

        }



        /*
         * Convert decimal years into
         * years and months.
         */

        let fullYears =
            Math.floor(
                years
            );


        let months =
            Math.ceil(
                (
                    years -
                    fullYears
                ) * 12
            );


        /*
         * Handle rounding such as:
         * 10 years + 12 months
         */

        if (
            months === 12
        ) {

            fullYears += 1;
            months = 0;

        }



        const durationParts =
            [];


        if (
            fullYears > 0
        ) {

            durationParts.push(
                `${fullYears} ${
                    fullYears === 1
                        ? "Year"
                        : "Years"
                }`
            );

        }


        if (
            months > 0
        ) {

            durationParts.push(
                `${months} ${
                    months === 1
                        ? "Month"
                        : "Months"
                }`
            );

        }



        const gain =
            target -
            principal;



        byId(
            "durationLumpsumTime"
        ).textContent =
            durationParts.join(
                " "
            );


        byId(
            "durationLumpsumInvested"
        ).textContent =
            formatINR(
                principal
            );


        byId(
            "durationLumpsumTarget"
        ).textContent =
            formatINR(
                target
            );


        byId(
            "durationLumpsumGain"
        ).textContent =
            formatINR(
                gain
            );

    }



    /* =========================================================
       3. LUMPSUM RETURN CALCULATOR
    ========================================================= */

    function calculateLumpsumReturn() {

        const initialValue =
            parseNumber(
                "returnLumpsumAmount"
            );


        const finalValue =
            parseNumber(
                "returnLumpsumCorpus"
            );


        const years =
            parseNumber(
                "returnLumpsumYears"
            );


        setError(
            "returnLumpsumError"
        );



        const initialError =
            validatePositive(
                initialValue,
                "Initial investment"
            );


        const finalError =
            validatePositive(
                finalValue,
                "Final value"
            );


        const yearsError =
            validateYears(
                years
            );


        const validationError =
            initialError ||
            finalError ||
            yearsError;


        if (
            validationError
        ) {

            setError(
                "returnLumpsumError",
                validationError
            );

            return;

        }



        /*
         * Annualised return for lumpsum
         * is CAGR.
         */

        const annualisedReturn =
            calculateCAGR(
                initialValue,
                finalValue,
                years
            );


        const gain =
            finalValue -
            initialValue;



        byId(
            "lumpsumAnnualisedReturn"
        ).textContent =
            `${annualisedReturn.toFixed(2)}%`;


        byId(
            "returnLumpsumInvested"
        ).textContent =
            formatINR(
                initialValue
            );


        byId(
            "returnLumpsumFinal"
        ).textContent =
            formatINR(
                finalValue
            );


        byId(
            "returnLumpsumGain"
        ).textContent =
            formatINR(
                gain
            );

    }



    /* =========================================================
       BUTTON EVENTS
    ========================================================= */

    function bindCalculatorEvents() {

        byId(
            "basicLumpsumCalculateBtn"
        ).addEventListener(
            "click",
            calculateBasicLumpsum
        );


        byId(
            "durationLumpsumCalculateBtn"
        ).addEventListener(
            "click",
            calculateLumpsumDuration
        );


        byId(
            "returnLumpsumCalculateBtn"
        ).addEventListener(
            "click",
            calculateLumpsumReturn
        );



        /*
         * Allow Enter key to calculate
         */

        const enterBindings = [

            [
                "basicLumpsumAmount",
                calculateBasicLumpsum
            ],

            [
                "basicLumpsumReturn",
                calculateBasicLumpsum
            ],

            [
                "basicLumpsumYears",
                calculateBasicLumpsum
            ],

            [
                "durationLumpsumAmount",
                calculateLumpsumDuration
            ],

            [
                "durationLumpsumReturn",
                calculateLumpsumDuration
            ],

            [
                "durationLumpsumGoal",
                calculateLumpsumDuration
            ],

            [
                "returnLumpsumAmount",
                calculateLumpsumReturn
            ],

            [
                "returnLumpsumCorpus",
                calculateLumpsumReturn
            ],

            [
                "returnLumpsumYears",
                calculateLumpsumReturn
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

        bindCalculatorEvents();


        /*
         * Populate default calculations
         * when the page loads.
         */

        calculateBasicLumpsum();

        calculateLumpsumDuration();

        calculateLumpsumReturn();

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