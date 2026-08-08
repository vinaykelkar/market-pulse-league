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
        message = ""
    ) {

        byId("cagrError").textContent =
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



    /* =========================================================
       CAGR CALCULATION
    ========================================================= */

    function calculateCAGR() {

        const initialValue =
            parseNumber(
                "cagrInitialValue"
            );


        const finalValue =
            parseNumber(
                "cagrFinalValue"
            );


        const years =
            parseNumber(
                "cagrYears"
            );


        setError();



        /* -----------------------------------------------------
           VALIDATION
        ----------------------------------------------------- */

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
                validationError
            );

            return;

        }



        /* -----------------------------------------------------
           CAGR FORMULA

           CAGR =
           (Final Value / Initial Value)^(1 / Years) - 1
        ----------------------------------------------------- */

        const cagr =
            (
                Math.pow(
                    finalValue /
                    initialValue,
                    1 / years
                ) - 1
            ) * 100;



        /* -----------------------------------------------------
           ABSOLUTE GAIN / LOSS
        ----------------------------------------------------- */

        const gain =
            finalValue -
            initialValue;



        /* -----------------------------------------------------
           TOTAL RETURN

           Total Return =
           (Gain / Initial Value) × 100
        ----------------------------------------------------- */

        const totalReturn =
            (
                gain /
                initialValue
            ) * 100;



        /* -----------------------------------------------------
           WEALTH MULTIPLE

           Example:

           ₹1 lakh → ₹2 lakh
           Wealth Multiple = 2×
        ----------------------------------------------------- */

        const wealthMultiple =
            finalValue /
            initialValue;



        /* -----------------------------------------------------
           DISPLAY RESULTS
        ----------------------------------------------------- */

        byId(
            "cagrResult"
        ).textContent =
            `${cagr.toFixed(2)}%`;


        byId(
            "cagrGain"
        ).textContent =
            formatINR(
                gain
            );


        byId(
            "cagrTotalReturn"
        ).textContent =
            `${totalReturn.toFixed(2)}%`;


        byId(
            "cagrMultiple"
        ).textContent =
            `${wealthMultiple.toFixed(2)}×`;

    }



    /* =========================================================
       EVENT BINDING
    ========================================================= */

    function bindEvents() {

        byId(
            "cagrCalculateBtn"
        ).addEventListener(
            "click",
            calculateCAGR
        );



        /*
         * Allow Enter key from any field
         */

        const inputIds = [

            "cagrInitialValue",
            "cagrFinalValue",
            "cagrYears"

        ];


        inputIds.forEach(
            (id) => {

                byId(
                    id
                ).addEventListener(
                    "keydown",
                    (event) => {

                        if (
                            event.key ===
                            "Enter"
                        ) {

                            calculateCAGR();

                        }

                    }
                );

            }
        );

    }



    /* =========================================================
       INITIALISE
    ========================================================= */

    function initialise() {

        bindEvents();

        calculateCAGR();

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