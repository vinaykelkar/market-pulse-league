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

        if (!Number.isFinite(value)) {

            return `${label} must be a valid number.`;

        }


        if (value <= 0) {

            return `${label} must be greater than zero.`;

        }


        return "";

    }


    function validateNonNegative(
        value,
        label
    ) {

        if (!Number.isFinite(value)) {

            return `${label} must be a valid number.`;

        }


        if (value < 0) {

            return `${label} cannot be negative.`;

        }


        return "";

    }


    function validateRate(
        value,
        label
    ) {

        if (!Number.isFinite(value)) {

            return `${label} must be a valid number.`;

        }


        if (
            value < 0 ||
            value > 100
        ) {

            return `${label} must be between 0% and 100%.`;

        }


        return "";

    }



    /* =========================================================
       COMMON FINANCIAL FUNCTIONS
    ========================================================= */


    /*
     * Future value of a single existing investment.
     */

    function futureValue(
        principal,
        annualRate,
        years
    ) {

        return (
            principal *
            Math.pow(
                1 + annualRate / 100,
                years
            )
        );

    }



    /*
     * Future value factor for monthly SIP.
     *
     * Consistent with our SIP Calculator:
     * monthly contribution occurs at the
     * BEGINNING of every month.
     */

    function sipFutureValueFactor(
        annualReturn,
        months
    ) {

        const monthlyRate =
            annualReturn /
            12 /
            100;


        if (
            Math.abs(monthlyRate) <
            1e-12
        ) {

            return months;

        }


        return (
            (
                Math.pow(
                    1 + monthlyRate,
                    months
                ) - 1
            ) /
            monthlyRate
        ) *
        (1 + monthlyRate);

    }



    /*
     * Monthly investment required to build
     * a specified future corpus.
     */

    function requiredMonthlySIP(
        futureAmountRequired,
        annualReturn,
        months
    ) {

        if (
            futureAmountRequired <= 0
        ) {

            return 0;

        }


        const factor =
            sipFutureValueFactor(
                annualReturn,
                months
            );


        return (
            futureAmountRequired /
            factor
        );

    }



    /* =========================================================
       MAIN TAB NAVIGATION
    ========================================================= */

    function initialiseTabs() {

        const tabs =
            document.querySelectorAll(
                ".goal-planner-tab"
            );


        const panels =
            document.querySelectorAll(
                ".goal-planner-panel"
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

                                const active =
                                    item === tab;


                                item.classList.toggle(
                                    "active",
                                    active
                                );


                                item.setAttribute(
                                    "aria-selected",
                                    String(active)
                                );

                            }
                        );


                        panels.forEach(
                            (panel) => {

                                const active =
                                    panel.id ===
                                    targetId;


                                panel.classList.toggle(
                                    "active",
                                    active
                                );


                                panel.hidden =
                                    !active;

                            }
                        );

                    }
                );

            }
        );

    }



    /* =========================================================
       GOAL TYPE SELECTOR
    ========================================================= */

    function initialiseGoalSelector() {

        const buttons =
            document.querySelectorAll(
                ".goal-type-btn"
            );


        buttons.forEach(
            (button) => {

                button.addEventListener(
                    "click",
                    () => {

                        buttons.forEach(
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


                        calculateFinancialGoal();

                    }
                );

            }
        );

    }



    /* =========================================================
       1. FINANCIAL GOAL CALCULATOR
    ========================================================= */

    function calculateFinancialGoal() {

        const targetAmount =
            parseNumber(
                "goalTargetAmount"
            );


        const currentSavings =
            parseNumber(
                "goalCurrentSavings"
            );


        const years =
            parseNumber(
                "goalYears"
            );


        const expectedReturn =
            parseNumber(
                "goalExpectedReturn"
            );


        setError(
            "goalPlannerError"
        );



        const targetError =
            validatePositive(
                targetAmount,
                "Target amount"
            );


        const savingsError =
            validateNonNegative(
                currentSavings,
                "Current savings"
            );


        const yearsError =
            validatePositive(
                years,
                "Years until goal"
            );


        const returnError =
            validateRate(
                expectedReturn,
                "Expected annual return"
            );


        const validationError =
            targetError ||
            savingsError ||
            yearsError ||
            returnError;


        if (validationError) {

            setError(
                "goalPlannerError",
                validationError
            );

            return;

        }


        if (
            years >
            MAX_YEARS
        ) {

            setError(
                "goalPlannerError",
                `Years until goal cannot exceed ${MAX_YEARS}.`
            );

            return;

        }



        const months =
            Math.round(
                years * 12
            );



        /*
         * Allow existing savings to compound
         * until the goal date.
         */

        const savingsFutureValue =
            futureValue(
                currentSavings,
                expectedReturn,
                years
            );



        /*
         * Remaining amount that monthly SIP
         * must build.
         */

        const remainingTarget =
            Math.max(
                0,
                targetAmount -
                savingsFutureValue
            );



        const monthlyInvestment =
            requiredMonthlySIP(
                remainingTarget,
                expectedReturn,
                months
            );



        const totalSIPContribution =
            monthlyInvestment *
            months;



        byId(
            "goalMonthlyInvestment"
        ).textContent =
            formatINR(
                monthlyInvestment
            );


        byId(
            "goalResultTarget"
        ).textContent =
            formatINR(
                targetAmount
            );


        byId(
            "goalSavingsFutureValue"
        ).textContent =
            formatINR(
                savingsFutureValue
            );


        byId(
            "goalTotalSIPContribution"
        ).textContent =
            formatINR(
                totalSIPContribution
            );



        if (
            monthlyInvestment <= 0
        ) {

            byId(
                "goalExplanation"
            ).innerHTML =
                `
                    <span class="goal-explanation-icon">
                        ${selectedGoal.icon}
                    </span>

                    <p>
                        Based on the assumptions entered,
                        your existing savings may already
                        grow enough to cover your
                        <strong>${selectedGoal.name.toLowerCase()}</strong>
                        target of
                        <strong>${formatCompactINR(targetAmount)}</strong>.
                    </p>
                `;

            return;

        }



        byId(
            "goalExplanation"
        ).innerHTML =
            `
                <span class="goal-explanation-icon">
                    ${selectedGoal.icon}
                </span>

                <p>
                    To target
                    <strong>${formatCompactINR(targetAmount)}</strong>
                    for your
                    <strong>${selectedGoal.name.toLowerCase()}</strong>
                    goal in
                    <strong>${years} ${years === 1 ? "year" : "years"}</strong>,
                    you may need to invest approximately
                    <strong>${formatINR(monthlyInvestment)} per month</strong>,
                    assuming
                    <strong>${expectedReturn}% annual returns</strong>.
                </p>
            `;

    }



    /* =========================================================
       RETIREMENT CORPUS
    ========================================================= */


    /*
     * Present value at retirement of an
     * inflation-growing annual expense stream.
     *
     * Expenses are assumed to be withdrawn
     * once per year at the end of each year.
     *
     * First year's retirement expense grows
     * with inflation thereafter.
     */

    function calculateRetirementCorpus(
        firstYearExpense,
        postRetirementReturn,
        inflationRate,
        retirementYears
    ) {

        const r =
            postRetirementReturn /
            100;


        const g =
            inflationRate /
            100;



        /*
         * Special case where return == inflation.
         */

        if (
            Math.abs(r - g) <
            1e-12
        ) {

            return (
                firstYearExpense *
                retirementYears /
                (1 + r)
            );

        }



        return (
            firstYearExpense /
            (r - g)
        ) *
        (
            1 -
            Math.pow(
                (1 + g) /
                (1 + r),
                retirementYears
            )
        );

    }



    /* =========================================================
       2. RETIREMENT CALCULATOR
    ========================================================= */

    function calculateRetirement() {

        const currentAge =
            parseNumber(
                "currentAge"
            );


        const retirementAge =
            parseNumber(
                "retirementAge"
            );


        const monthlyExpenses =
            parseNumber(
                "monthlyExpenses"
            );


        const inflationRate =
            parseNumber(
                "retirementInflation"
            );


        const lifeExpectancy =
            parseNumber(
                "lifeExpectancy"
            );


        const currentSavings =
            parseNumber(
                "retirementCurrentSavings"
            );


        const preReturn =
            parseNumber(
                "preRetirementReturn"
            );


        const postReturn =
            parseNumber(
                "postRetirementReturn"
            );


        setError(
            "retirementError"
        );



        /* -----------------------------------------------------
           VALIDATION
        ----------------------------------------------------- */

        if (
            !Number.isFinite(currentAge) ||
            currentAge < 18 ||
            currentAge >= 100
        ) {

            setError(
                "retirementError",
                "Please enter a valid current age."
            );

            return;

        }


        if (
            !Number.isFinite(retirementAge) ||
            retirementAge <= currentAge
        ) {

            setError(
                "retirementError",
                "Retirement age must be greater than current age."
            );

            return;

        }


        if (
            retirementAge >
            100
        ) {

            setError(
                "retirementError",
                "Retirement age cannot exceed 100."
            );

            return;

        }


        if (
            !Number.isFinite(lifeExpectancy) ||
            lifeExpectancy <= retirementAge
        ) {

            setError(
                "retirementError",
                "Plan-until age must be greater than retirement age."
            );

            return;

        }


        if (
            lifeExpectancy >
            120
        ) {

            setError(
                "retirementError",
                "Plan-until age cannot exceed 120."
            );

            return;

        }



        const expenseError =
            validatePositive(
                monthlyExpenses,
                "Monthly expenses"
            );


        const savingsError =
            validateNonNegative(
                currentSavings,
                "Current retirement savings"
            );


        const inflationError =
            validateRate(
                inflationRate,
                "Inflation"
            );


        const preReturnError =
            validateRate(
                preReturn,
                "Return before retirement"
            );


        const postReturnError =
            validateRate(
                postReturn,
                "Return after retirement"
            );


        const validationError =
            expenseError ||
            savingsError ||
            inflationError ||
            preReturnError ||
            postReturnError;


        if (
            validationError
        ) {

            setError(
                "retirementError",
                validationError
            );

            return;

        }



        const yearsToRetirement =
            retirementAge -
            currentAge;


        const retirementYears =
            lifeExpectancy -
            retirementAge;



        /* -----------------------------------------------------
           FUTURE MONTHLY EXPENSE

           Today's monthly expense is inflated
           until retirement.
        ----------------------------------------------------- */

        const futureMonthlyExpense =
            monthlyExpenses *
            Math.pow(
                1 + inflationRate / 100,
                yearsToRetirement
            );



        /*
         * First full year of retirement expenses.
         */

        const firstYearExpense =
            futureMonthlyExpense *
            12;



        /* -----------------------------------------------------
           REQUIRED CORPUS AT RETIREMENT
        ----------------------------------------------------- */

        const requiredCorpus =
            calculateRetirementCorpus(
                firstYearExpense,
                postReturn,
                inflationRate,
                retirementYears
            );



        /* -----------------------------------------------------
           EXISTING SAVINGS AT RETIREMENT
        ----------------------------------------------------- */

        const savingsAtRetirement =
            futureValue(
                currentSavings,
                preReturn,
                yearsToRetirement
            );



        /*
         * Amount still required from future
         * monthly contributions.
         */

        const corpusGap =
            Math.max(
                0,
                requiredCorpus -
                savingsAtRetirement
            );



        const monthsToRetirement =
            Math.round(
                yearsToRetirement *
                12
            );



        const requiredMonthlyInvestment =
            requiredMonthlySIP(
                corpusGap,
                preReturn,
                monthsToRetirement
            );



        /* -----------------------------------------------------
           DISPLAY RESULTS
        ----------------------------------------------------- */

        byId(
            "retirementCorpus"
        ).textContent =
            formatINR(
                requiredCorpus
            );


        byId(
            "futureMonthlyExpense"
        ).textContent =
            formatINR(
                futureMonthlyExpense
            );


        byId(
            "retirementSavingsFuture"
        ).textContent =
            formatINR(
                savingsAtRetirement
            );


        byId(
            "retirementMonthlyInvestment"
        ).textContent =
            formatINR(
                requiredMonthlyInvestment
            );



        if (
            requiredMonthlyInvestment <= 0
        ) {

            byId(
                "retirementExplanation"
            ).innerHTML =
                `
                    <span class="goal-explanation-icon">
                        🌅
                    </span>

                    <p>
                        Based on these assumptions,
                        your existing retirement savings may
                        grow enough to cover the estimated
                        retirement corpus of
                        <strong>${formatCompactINR(requiredCorpus)}</strong>
                        by age
                        <strong>${retirementAge}</strong>.
                    </p>
                `;

            return;

        }



        byId(
            "retirementExplanation"
        ).innerHTML =
            `
                <span class="goal-explanation-icon">
                    🌅
                </span>

                <p>
                    To retire at
                    <strong>age ${retirementAge}</strong>
                    and plan expenses until
                    <strong>age ${lifeExpectancy}</strong>,
                    you may need approximately
                    <strong>${formatCompactINR(requiredCorpus)}</strong>
                    at retirement.

                    Based on your current savings,
                    this may require investing around
                    <strong>${formatINR(requiredMonthlyInvestment)} per month</strong>
                    until retirement.
                </p>
            `;

    }



    /* =========================================================
       EVENT BINDING
    ========================================================= */

    function bindEvents() {

        byId(
            "goalCalculateBtn"
        ).addEventListener(
            "click",
            calculateFinancialGoal
        );


        byId(
            "retirementCalculateBtn"
        ).addEventListener(
            "click",
            calculateRetirement
        );



        const financialGoalFields = [

            "goalTargetAmount",
            "goalCurrentSavings",
            "goalYears",
            "goalExpectedReturn"

        ];


        financialGoalFields.forEach(
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

                            calculateFinancialGoal();

                        }

                    }
                );

            }
        );



        const retirementFields = [

            "currentAge",
            "retirementAge",
            "monthlyExpenses",
            "retirementInflation",
            "lifeExpectancy",
            "retirementCurrentSavings",
            "preRetirementReturn",
            "postRetirementReturn"

        ];


        retirementFields.forEach(
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

                            calculateRetirement();

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

        initialiseTabs();

        initialiseGoalSelector();

        bindEvents();


        calculateFinancialGoal();

        calculateRetirement();

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