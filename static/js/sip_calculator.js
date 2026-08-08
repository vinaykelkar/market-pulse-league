(() => {
    "use strict";

    const MAX_YEARS = 100;
    const MAX_MONTHS = MAX_YEARS * 12;


    /* =========================================================
       COMMON HELPERS
    ========================================================= */

    function byId(id) {
        return document.getElementById(id);
    }


    function parseNumber(id) {
        return Number.parseFloat(byId(id).value);
    }


    function formatINR(value) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(Math.round(value));
    }


    function setError(id, message = "") {
        byId(id).textContent = message;
    }


    /*
     * Future Value of SIP
     *
     * Assumption:
     * SIP contribution is made at the BEGINNING of every month.
     *
     * Annual return is divided by 12 to derive
     * the monthly rate.
     */
    function calculateFutureSIP(
        monthlySIP,
        annualReturnPercent,
        months
    ) {

        const monthlyRate =
            annualReturnPercent / 12 / 100;


        /*
         * Special handling for 0% return.
         * This also avoids division by zero.
         */
        if (Math.abs(monthlyRate) < 1e-12) {
            return monthlySIP * months;
        }


        return (
            monthlySIP *
            (
                (
                    Math.pow(1 + monthlyRate, months) - 1
                ) / monthlyRate
            ) *
            (1 + monthlyRate)
        );
    }



    /* =========================================================
       VALIDATION HELPERS
    ========================================================= */

    function validatePositive(value, label) {

        if (!Number.isFinite(value)) {
            return `${label} must be a valid number.`;
        }


        if (value <= 0) {
            return `${label} must be greater than zero.`;
        }


        return "";
    }


    function validateYears(years) {

        if (!Number.isFinite(years)) {
            return "Investment period must be a valid number.";
        }


        if (years <= 0 || years > MAX_YEARS) {
            return (
                `Investment period must be greater than 0 ` +
                `and no more than ${MAX_YEARS} years.`
            );
        }


        return "";
    }


    function validateExpectedReturn(rate) {

        if (!Number.isFinite(rate)) {
            return "Expected annual return must be a valid number.";
        }


        if (rate < 0 || rate > 100) {
            return (
                "Expected annual return must be " +
                "between 0% and 100%."
            );
        }


        return "";
    }



    /* =========================================================
       TAB NAVIGATION
    ========================================================= */

    function initialiseTabs() {

        const tabs =
            document.querySelectorAll(".sip-tab");

        const panels =
            document.querySelectorAll(".sip-panel");


        tabs.forEach((tab) => {

            tab.addEventListener("click", () => {

                const targetId =
                    tab.dataset.target;


                /*
                 * Update tab state
                 */
                tabs.forEach((item) => {

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

                });


                /*
                 * Show selected calculator
                 */
                panels.forEach((panel) => {

                    const isActive =
                        panel.id === targetId;

                    panel.classList.toggle(
                        "active",
                        isActive
                    );

                    panel.hidden =
                        !isActive;

                });

            });

        });

    }



    /* =========================================================
       1. BASIC SIP CALCULATOR
    ========================================================= */

    function calculateBasicSIP() {

        const monthlySIP =
            parseNumber("basicAmount");

        const annualReturn =
            parseNumber("basicReturn");

        const years =
            parseNumber("basicYears");


        setError("basicError");


        /*
         * Validation
         */
        const amountError =
            validatePositive(
                monthlySIP,
                "Monthly SIP"
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
            amountError ||
            returnError ||
            yearsError;


        if (validationError) {

            setError(
                "basicError",
                validationError
            );

            return;
        }


        /*
         * Convert years to SIP installments
         */
        const months =
            Math.round(years * 12);


        /*
         * Total amount contributed
         */
        const invested =
            monthlySIP * months;


        /*
         * Future value of all SIP contributions
         */
        const corpus =
            calculateFutureSIP(
                monthlySIP,
                annualReturn,
                months
            );


        /*
         * Estimated investment gain
         */
        const gain =
            corpus - invested;


        /*
         * Display results
         */
        byId("basicCorpus").textContent =
            formatINR(corpus);

        byId("basicInvested").textContent =
            formatINR(invested);

        byId("basicGain").textContent =
            formatINR(gain);

        byId("basicInstallments").textContent =
            months.toLocaleString("en-IN");

    }



    /* =========================================================
       2. SIP DURATION CALCULATOR
    ========================================================= */

    function calculateSIPDuration() {

        const monthlySIP =
            parseNumber("durationAmount");

        const annualReturn =
            parseNumber("durationReturn");

        const targetCorpus =
            parseNumber("durationGoal");


        setError("durationError");


        /*
         * Validation
         */
        const amountError =
            validatePositive(
                monthlySIP,
                "Monthly SIP"
            );

        const returnError =
            validateExpectedReturn(
                annualReturn
            );

        const targetError =
            validatePositive(
                targetCorpus,
                "Target corpus"
            );


        const validationError =
            amountError ||
            returnError ||
            targetError;


        if (validationError) {

            setError(
                "durationError",
                validationError
            );

            return;
        }


        /*
         * Keep calculating the corpus month-by-month
         * until the target is reached.
         */
        let months = 0;
        let corpus = 0;


        while (
            corpus < targetCorpus &&
            months < MAX_MONTHS
        ) {

            months += 1;

            corpus =
                calculateFutureSIP(
                    monthlySIP,
                    annualReturn,
                    months
                );

        }


        /*
         * Safety limit
         */
        if (corpus < targetCorpus) {

            setError(
                "durationError",
                `Target could not be reached within ` +
                `${MAX_YEARS} years using these assumptions.`
            );

            return;
        }


        /*
         * Convert total months into years + months
         */
        const fullYears =
            Math.floor(months / 12);

        const remainingMonths =
            months % 12;


        const durationParts = [];


        if (fullYears > 0) {

            durationParts.push(
                `${fullYears} ${
                    fullYears === 1
                        ? "Year"
                        : "Years"
                }`
            );

        }


        if (remainingMonths > 0) {

            durationParts.push(
                `${remainingMonths} ${
                    remainingMonths === 1
                        ? "Month"
                        : "Months"
                }`
            );

        }


        if (durationParts.length === 0) {
            durationParts.push(
                "Less than 1 Month"
            );
        }


        /*
         * Amount actually contributed
         * during the calculated duration
         */
        const invested =
            monthlySIP * months;


        /*
         * Display results
         */
        byId("durationTime").textContent =
            durationParts.join(" ");

        byId("durationMonths").textContent =
            months.toLocaleString("en-IN");

        byId("durationInvested").textContent =
            formatINR(invested);

        byId("durationCorpus").textContent =
            formatINR(corpus);

    }



    /* =========================================================
       3. SIP RETURN CALCULATOR
    ========================================================= */

    function calculateSIPReturn() {

        const monthlySIP =
            parseNumber("returnAmount");

        const years =
            parseNumber("returnYears");

        const finalCorpus =
            parseNumber("returnCorpus");


        setError("returnError");


        /*
         * Validation
         */
        const amountError =
            validatePositive(
                monthlySIP,
                "Monthly SIP"
            );

        const yearsError =
            validateYears(
                years
            );

        const corpusError =
            validatePositive(
                finalCorpus,
                "Final corpus"
            );


        const validationError =
            amountError ||
            yearsError ||
            corpusError;


        if (validationError) {

            setError(
                "returnError",
                validationError
            );

            return;
        }


        const months =
            Math.round(years * 12);


        const invested =
            monthlySIP * months;


        const gain =
            finalCorpus - invested;


        /*
         * -----------------------------------------------------
         * RETURN CALCULATION
         * -----------------------------------------------------
         *
         * We know:
         *
         * Monthly SIP
         * Number of installments
         * Final corpus
         *
         * But we do NOT know the return.
         *
         * Therefore, binary search is used to find the
         * annual return that produces approximately the
         * entered final corpus.
         *
         * Search range:
         *
         * -99% annual return
         * to
         * 1000% annual return
         *
         * Negative returns are therefore supported.
         */


        let low = -99;
        let high = 1000;


        /*
         * Check whether the requested corpus can be
         * solved within our supported return range.
         */
        const lowCorpus =
            calculateFutureSIP(
                monthlySIP,
                low,
                months
            );


        const highCorpus =
            calculateFutureSIP(
                monthlySIP,
                high,
                months
            );


        if (
            finalCorpus < lowCorpus ||
            finalCorpus > highCorpus
        ) {

            setError(
                "returnError",
                "The entered corpus is outside the return " +
                "range supported by this calculator."
            );

            return;
        }


        /*
         * Binary search
         */
        for (
            let i = 0;
            i < 120;
            i += 1
        ) {

            const mid =
                (low + high) / 2;


            const calculatedCorpus =
                calculateFutureSIP(
                    monthlySIP,
                    mid,
                    months
                );


            if (
                calculatedCorpus <
                finalCorpus
            ) {

                low = mid;

            } else {

                high = mid;

            }

        }


        /*
         * Final estimated annual return
         */
        const estimatedAnnualReturn =
            (low + high) / 2;


        /*
         * Display results
         */
        byId("annualisedReturn").textContent =
            `${estimatedAnnualReturn.toFixed(2)}%`;

        byId("returnInvested").textContent =
            formatINR(invested);

        byId("returnGain").textContent =
            formatINR(gain);

        byId("returnInstallments").textContent =
            months.toLocaleString("en-IN");

    }



    /* =========================================================
       BUTTON EVENT BINDING
    ========================================================= */

    function bindCalculatorEvents() {

        byId("basicCalculateBtn")
            .addEventListener(
                "click",
                calculateBasicSIP
            );


        byId("durationCalculateBtn")
            .addEventListener(
                "click",
                calculateSIPDuration
            );


        byId("returnCalculateBtn")
            .addEventListener(
                "click",
                calculateSIPReturn
            );


        /*
         * Also allow Enter key to calculate.
         */
        const enterBindings = [

            [
                "basicAmount",
                calculateBasicSIP
            ],

            [
                "basicReturn",
                calculateBasicSIP
            ],

            [
                "basicYears",
                calculateBasicSIP
            ],

            [
                "durationAmount",
                calculateSIPDuration
            ],

            [
                "durationReturn",
                calculateSIPDuration
            ],

            [
                "durationGoal",
                calculateSIPDuration
            ],

            [
                "returnAmount",
                calculateSIPReturn
            ],

            [
                "returnYears",
                calculateSIPReturn
            ],

            [
                "returnCorpus",
                calculateSIPReturn
            ]

        ];


        enterBindings.forEach(
            ([id, handler]) => {

                byId(id).addEventListener(
                    "keydown",
                    (event) => {

                        if (
                            event.key === "Enter"
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
         * Populate all three calculators with their
         * default example values immediately.
         */
        calculateBasicSIP();

        calculateSIPDuration();

        calculateSIPReturn();

    }


    /*
     * Run only after the HTML has loaded.
     */
    if (
        document.readyState === "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialise
        );

    } else {

        initialise();

    }

})();