document.addEventListener("DOMContentLoaded", function () {

    // =========================================================
    // 1. DOM REFERENCES
    // =========================================================

    const manualModeButton =
        document.getElementById("manualModeButton");

    const excelModeButton =
        document.getElementById("excelModeButton");

    const manualPanel =
        document.getElementById("manualPanel");

    const excelPanel =
        document.getElementById("excelPanel");

    const transactionBody =
        document.getElementById("transactionBody");

    const addTransactionButton =
        document.getElementById("addTransactionButton");

    const calculateManualButton =
        document.getElementById("calculateManualButton");

    const resetManualButton =
        document.getElementById("resetManualButton");

    const manualMessage =
        document.getElementById("manualMessage");

    const xlsxFileInput =
        document.getElementById("xlsxFileInput");

    const xlsxFileName =
        document.getElementById("xlsxFileName");

    const calculateExcelButton =
        document.getElementById("calculateExcelButton");

    const resetExcelButton =
        document.getElementById("resetExcelButton");

    const excelMessage =
        document.getElementById("excelMessage");

    const resultCard =
        document.getElementById("resultCard");

    const resultXirr =
        document.getElementById("resultXirr");

    const resultInvested =
        document.getElementById("resultInvested");

    const resultWithdrawn =
        document.getElementById("resultWithdrawn");

    const resultCurrentValue =
        document.getElementById("resultCurrentValue");

    const resultProfit =
        document.getElementById("resultProfit");

    const resultAbsoluteReturn =
        document.getElementById("resultAbsoluteReturn");
	
	const xirrWarning =
		document.getElementById("xirrWarning");

	const xirrWarningText =
		document.getElementById("xirrWarningText");

    let excelTransactions = null;


    // =========================================================
    // 2. MODE SWITCH
    // =========================================================

    if (manualModeButton && excelModeButton) {

        manualModeButton.addEventListener(
            "click",
            function () {

                manualModeButton.classList.add("active");
                excelModeButton.classList.remove("active");

                manualPanel.classList.remove("xirr-hidden");
                excelPanel.classList.add("xirr-hidden");

                hideResult();

            }
        );


        excelModeButton.addEventListener(
            "click",
            function () {

                excelModeButton.classList.add("active");
                manualModeButton.classList.remove("active");

                excelPanel.classList.remove("xirr-hidden");
                manualPanel.classList.add("xirr-hidden");

                hideResult();

            }
        );

    }


    // =========================================================
    // 3. CREATE TRANSACTION ROW
    // =========================================================

    function createTransactionRow() {

        const row = document.createElement("tr");

        row.classList.add("xirr-transaction-row");

        row.innerHTML = `
            <td>
                <input
                    type="date"
                    class="xirr-date-input"
                >
            </td>

            <td>
                <select class="xirr-type-input">

                    <option value="">
                        Select Type
                    </option>

                    <option value="investment">
                        Investment
                    </option>

                    <option value="withdrawal">
                        Withdrawal
                    </option>

                    <option value="current value">
                        Current Value
                    </option>

                </select>
            </td>

            <td>
                <div class="xirr-amount-wrapper">

                    <span>₹</span>

                    <input
                        type="number"
                        class="xirr-amount-input"
                        min="0.01"
                        step="0.01"
                        placeholder="0"
                    >

                </div>
            </td>

            <td>
                <button
                    type="button"
                    class="xirr-delete-row"
                    aria-label="Delete transaction"
                >
                    ×
                </button>
            </td>
        `;

        transactionBody.appendChild(row);

        updateCurrentValueState();

    }


    // =========================================================
    // 4. ADD TRANSACTION
    // =========================================================

    if (addTransactionButton) {

        addTransactionButton.addEventListener(
            "click",
            function () {

                if (addTransactionButton.disabled) {
                    return;
                }

                clearMessage(manualMessage);

                createTransactionRow();

                hideResult();

            }
        );

    }


    // =========================================================
    // 5. TABLE CHANGE HANDLING
    // =========================================================

    if (transactionBody) {

        transactionBody.addEventListener(
            "change",
            function (event) {

                if (
                    event.target.classList.contains(
                        "xirr-type-input"
                    )
                ) {

                    updateCurrentValueState();

                    hideResult();

                }

            }
        );


        transactionBody.addEventListener(
            "input",
            function () {

                hideResult();

            }
        );

    }


    // =========================================================
    // 6. DELETE TRANSACTION ROW
    // =========================================================

    if (transactionBody) {

        transactionBody.addEventListener(
            "click",
            function (event) {

                if (
                    !event.target.classList.contains(
                        "xirr-delete-row"
                    )
                ) {
                    return;
                }

                const rows =
                    transactionBody.querySelectorAll(
                        ".xirr-transaction-row"
                    );


                if (rows.length <= 1) {

                    showMessage(
                        manualMessage,
                        "At least one transaction row must remain.",
                        "error"
                    );

                    return;

                }


                event.target
                    .closest(".xirr-transaction-row")
                    .remove();


                clearMessage(manualMessage);

                updateCurrentValueState();

                hideResult();

            }
        );

    }


    // =========================================================
    // 7. CURRENT VALUE STATE
    // =========================================================

    function updateCurrentValueState() {

        const rows =
            Array.from(
                transactionBody.querySelectorAll(
                    ".xirr-transaction-row"
                )
            );


        const currentValueRows =
            rows.filter(
                function (row) {

                    const typeSelect =
                        row.querySelector(
                            ".xirr-type-input"
                        );

                    return (
                        typeSelect &&
                        typeSelect.value ===
                        "current value"
                    );

                }
            );


        const currentValueExists =
            currentValueRows.length > 0;


        /*
         * Once Current Value exists,
         * the user cannot add anything after it.
         */
        addTransactionButton.disabled =
            currentValueExists;


        /*
         * Once one row contains Current Value,
         * disable Current Value in every other row.
         */
        rows.forEach(
            function (row) {

                const typeSelect =
                    row.querySelector(
                        ".xirr-type-input"
                    );

                if (!typeSelect) {
                    return;
                }


                const currentValueOption =
                    Array.from(
                        typeSelect.options
                    ).find(
                        function (option) {
                            return (
                                option.value ===
                                "current value"
                            );
                        }
                    );


                if (!currentValueOption) {
                    return;
                }


                if (
                    currentValueExists &&
                    typeSelect.value !==
                    "current value"
                ) {

                    currentValueOption.disabled =
                        true;

                } else {

                    currentValueOption.disabled =
                        false;

                }

            }
        );

    }


    // =========================================================
    // 8. COLLECT MANUAL TRANSACTIONS
    // =========================================================

    function collectManualTransactions() {

        const rows =
            Array.from(
                transactionBody.querySelectorAll(
                    ".xirr-transaction-row"
                )
            );


        const transactions = [];


        for (
            let index = 0;
            index < rows.length;
            index++
        ) {

            const row = rows[index];


            const dateValue =
                row.querySelector(
                    ".xirr-date-input"
                ).value;


            const typeValue =
                row.querySelector(
                    ".xirr-type-input"
                ).value;


            const amountValue =
                row.querySelector(
                    ".xirr-amount-input"
                ).value;


            if (
                !dateValue ||
                !typeValue ||
                amountValue === ""
            ) {

                throw new Error(
                    `Please complete all fields in transaction ${index + 1}.`
                );

            }


            const parsedDate =
                parseDate(dateValue);


            if (!parsedDate) {

                throw new Error(
                    `Date in transaction ${index + 1} is invalid.`
                );

            }


            const parsedAmount =
                Number(amountValue);


            if (
                !Number.isFinite(parsedAmount) ||
                parsedAmount <= 0
            ) {

                throw new Error(
                    `Amount in transaction ${index + 1} must be greater than zero.`
                );

            }


            transactions.push({
                date: parsedDate,
                type: typeValue,
                amount: parsedAmount
            });

        }


        return transactions;

    }


    // =========================================================
    // 9. COMMON TRANSACTION VALIDATION
    // =========================================================

    function validateTransactions(
        transactions
    ) {

        if (
            !Array.isArray(transactions) ||
            transactions.length < 2
        ) {

            throw new Error(
                "Please enter at least two transactions."
            );

        }


        const investmentRows =
            transactions.filter(
                function (transaction) {
                    return (
                        transaction.type ===
                        "investment"
                    );
                }
            );


        const currentValueRows =
            transactions.filter(
                function (transaction) {
                    return (
                        transaction.type ===
                        "current value"
                    );
                }
            );


        if (
            investmentRows.length === 0
        ) {

            throw new Error(
                "At least one Investment transaction is required."
            );

        }


        if (
            currentValueRows.length !== 1
        ) {

            throw new Error(
                "Exactly one Current Value transaction is required."
            );

        }


        const lastTransaction =
            transactions[
                transactions.length - 1
            ];


        if (
            lastTransaction.type !==
            "current value"
        ) {

            throw new Error(
                "Current Value must be the final transaction."
            );

        }


        /*
         * Current Value must also contain
         * the latest date in the history.
         */
        const latestDate =
            Math.max(
                ...transactions.map(
                    function (transaction) {
                        return (
                            transaction.date.getTime()
                        );
                    }
                )
            );


        if (
            lastTransaction.date.getTime()
            !== latestDate
        ) {

            throw new Error(
                "Current Value must have the latest date."
            );

        }


        const today = new Date();

        today.setHours(
            23,
            59,
            59,
            999
        );


        transactions.forEach(
            function (transaction) {

                if (
                    !(transaction.date instanceof Date) ||
                    Number.isNaN(
                        transaction.date.getTime()
                    )
                ) {

                    throw new Error(
                        "One or more Date values are invalid."
                    );

                }


                if (
                    transaction.date > today
                ) {

                    throw new Error(
                        "Transaction dates cannot be in the future."
                    );

                }


                if (
                    !Number.isFinite(
                        transaction.amount
                    ) ||
                    transaction.amount <= 0
                ) {

                    throw new Error(
                        "All Amount values must be greater than zero."
                    );

                }

            }
        );


        const cashFlows =
            normalizeCashFlows(
                transactions
            );


        const hasNegative =
            cashFlows.some(
                function (cashFlow) {
                    return (
                        cashFlow.amount < 0
                    );
                }
            );


        const hasPositive =
            cashFlows.some(
                function (cashFlow) {
                    return (
                        cashFlow.amount > 0
                    );
                }
            );


        if (
            !hasNegative ||
            !hasPositive
        ) {

            throw new Error(
                "XIRR requires both money invested and money received."
            );

        }

    }


    // =========================================================
    // 10. NORMALIZE CASH FLOWS
    // =========================================================

    function normalizeCashFlows(
        transactions
    ) {

        return transactions.map(
            function (transaction) {

                let cashFlowAmount;


                if (
                    transaction.type ===
                    "investment"
                ) {

                    cashFlowAmount =
                        -transaction.amount;

                } else {

                    cashFlowAmount =
                        transaction.amount;

                }


                return {
                    date: transaction.date,
                    amount: cashFlowAmount
                };

            }
        );

    }


    // =========================================================
    // 11. XIRR CALCULATION
    // =========================================================

    function calculateXirr(
        cashFlows
    ) {

        /*
         * XIRR should use the earliest dated
         * cash flow as the base date.
         */
        const sortedCashFlows =
            [...cashFlows].sort(
                function (a, b) {
                    return (
                        a.date - b.date
                    );
                }
            );


        const firstDate =
            sortedCashFlows[0].date;


        function xnpv(rate) {

            return sortedCashFlows.reduce(
                function (
                    total,
                    cashFlow
                ) {

                    const days =
                        (
                            cashFlow.date -
                            firstDate
                        ) /
                        (
                            1000 *
                            60 *
                            60 *
                            24
                        );


                    return (
                        total +
                        cashFlow.amount /
                        Math.pow(
                            1 + rate,
                            days / 365
                        )
                    );

                },
                0
            );

        }


        /*
         * Bisection method.
         *
         * Lower limit must remain above -100%.
         */
        let low = -0.999999;
        let high = 1;

        let lowValue =
            xnpv(low);

        let highValue =
            xnpv(high);


        /*
         * Expand upper bound when the return
         * is greater than 100%.
         */
        let expansionCount = 0;


        while (
            lowValue * highValue > 0 &&
            expansionCount < 100
        ) {

            high *= 2;

            highValue =
                xnpv(high);

            expansionCount++;

        }


        if (
            !Number.isFinite(lowValue) ||
            !Number.isFinite(highValue) ||
            lowValue * highValue > 0
        ) {

            throw new Error(
                "An XIRR could not be calculated for these cash flows."
            );

        }


        let midpoint = 0;


        for (
            let iteration = 0;
            iteration < 250;
            iteration++
        ) {

            midpoint =
                (low + high) / 2;


            const midpointValue =
                xnpv(midpoint);


            if (
                !Number.isFinite(
                    midpointValue
                )
            ) {

                throw new Error(
                    "An XIRR could not be calculated for these cash flows."
                );

            }


            if (
                Math.abs(midpointValue) <
                0.000001
            ) {

                return midpoint;

            }


            if (
                lowValue *
                midpointValue <= 0
            ) {

                high =
                    midpoint;

                highValue =
                    midpointValue;

            } else {

                low =
                    midpoint;

                lowValue =
                    midpointValue;

            }

        }


        return midpoint;

    }


    // =========================================================
    // 12. ABSOLUTE PERFORMANCE
    // =========================================================

    function calculateSummary(
        transactions
    ) {

        let totalInvested = 0;
        let totalWithdrawn = 0;
        let currentValue = 0;


        transactions.forEach(
            function (transaction) {

                if (
                    transaction.type ===
                    "investment"
                ) {

                    totalInvested +=
                        transaction.amount;

                }


                if (
                    transaction.type ===
                    "withdrawal"
                ) {

                    totalWithdrawn +=
                        transaction.amount;

                }


                if (
                    transaction.type ===
                    "current value"
                ) {

                    currentValue +=
                        transaction.amount;

                }

            }
        );


        const totalValue =
            totalWithdrawn +
            currentValue;


        const absoluteProfit =
            totalValue -
            totalInvested;


        const absoluteReturn =
            totalInvested > 0
                ? (
                    absoluteProfit /
                    totalInvested
                ) * 100
                : 0;


        return {
            totalInvested,
            totalWithdrawn,
            currentValue,
            absoluteProfit,
            absoluteReturn
        };

    }


    // =========================================================
    // 13. RUN CALCULATION
    // =========================================================

    function runCalculation(
        transactions,
        messageElement
    ) {

        try {

            clearMessage(
                messageElement
            );


            validateTransactions(
                transactions
            );


            const cashFlows =
                normalizeCashFlows(
                    transactions
                );


            const xirr =
                calculateXirr(
                    cashFlows
                );


const summary =
    calculateSummary(
        transactions
    );


const investmentPeriodDays =
    calculateInvestmentPeriodDays(
        transactions
    );


displayResult(
    xirr,
    summary,
    investmentPeriodDays
);


        } catch (error) {

            hideResult();


            showMessage(
                messageElement,
                error.message,
                "error"
            );

        }

    }


    // =========================================================
    // 14. MANUAL CALCULATION
    // =========================================================

    if (calculateManualButton) {

        calculateManualButton.addEventListener(
            "click",
            function () {

                try {

                    const transactions =
                        collectManualTransactions();


                    runCalculation(
                        transactions,
                        manualMessage
                    );


                } catch (error) {

                    hideResult();


                    showMessage(
                        manualMessage,
                        error.message,
                        "error"
                    );

                }

            }
        );

    }


    // =========================================================
    // 15. XLSX FILE SELECTION
    // =========================================================

    if (xlsxFileInput) {

        xlsxFileInput.addEventListener(
            "change",
            async function () {

                excelTransactions =
                    null;


                hideResult();

                clearMessage(
                    excelMessage
                );


                const file =
                    xlsxFileInput.files[0];


                if (!file) {

                    xlsxFileName.textContent =
                        "No file selected";

                    return;

                }


                xlsxFileName.textContent =
                    file.name;


                if (
                    !file.name
                        .toLowerCase()
                        .endsWith(".xlsx")
                ) {

                    showMessage(
                        excelMessage,
                        "Please upload an XLSX file.",
                        "error"
                    );


                    xlsxFileInput.value =
                        "";


                    xlsxFileName.textContent =
                        "No file selected";


                    return;

                }


                try {

                    excelTransactions =
                        await parseXlsxFile(
                            file
                        );


                    validateTransactions(
                        excelTransactions
                    );


                    showMessage(
                        excelMessage,
                        "XLSX file validated successfully.",
                        "success"
                    );


                } catch (error) {

                    excelTransactions =
                        null;


                    showMessage(
                        excelMessage,
                        error.message,
                        "error"
                    );

                }

            }
        );

    }


    // =========================================================
    // 16. XLSX PARSING
    // =========================================================

    async function parseXlsxFile(
        file
    ) {

        if (
            typeof XLSX ===
            "undefined"
        ) {

            throw new Error(
                "XLSX reader could not be loaded. Please refresh the page and try again."
            );

        }


        const arrayBuffer =
            await file.arrayBuffer();


        const workbook =
            XLSX.read(
                arrayBuffer,
                {
                    type: "array",
                    cellDates: true
                }
            );


        if (
            workbook.SheetNames.length ===
            0
        ) {

            throw new Error(
                "The XLSX file does not contain a worksheet."
            );

        }


        /*
         * Only the first worksheet is processed.
         */
        const worksheet =
            workbook.Sheets[
                workbook.SheetNames[0]
            ];


        const rows =
            XLSX.utils.sheet_to_json(
                worksheet,
                {
                    header: 1,
                    raw: true,
                    defval: null
                }
            );


        /*
         * Ignore completely blank rows.
         */
        const nonEmptyRows =
            rows.filter(
                function (row) {

                    return row.some(
                        function (cell) {

                            return (
                                cell !== null &&
                                cell !== undefined &&
                                String(cell).trim() !== ""
                            );

                        }
                    );

                }
            );


        if (
            nonEmptyRows.length < 2
        ) {

            throw new Error(
                "The XLSX file does not contain transaction data."
            );

        }


        const headers =
            nonEmptyRows[0].map(
                normalizeHeader
            );


        validateExcelHeaders(
            headers
        );


        const dataRows =
            nonEmptyRows.slice(1);


        const transactions =
            dataRows.map(
                function (
                    row,
                    index
                ) {

                    /*
                     * Reject extra populated columns.
                     */
                    if (
                        row.length > 3 &&
                        row
                            .slice(3)
                            .some(
                                function (cell) {

                                    return (
                                        cell !== null &&
                                        cell !== undefined &&
                                        String(cell).trim() !== ""
                                    );

                                }
                            )
                    ) {

                        throw new Error(
                            "Please make sure your XLSX file contains only Date, Transaction Type and Amount columns."
                        );

                    }


                    const date =
                        parseExcelDate(
                            row[0]
                        );


                    const type =
                        normalizeTransactionType(
                            row[1]
                        );


                    const amount =
                        parseExcelAmount(
                            row[2]
                        );


                    if (!date) {

                        throw new Error(
                            `Date column has an issue in row ${index + 2}.`
                        );

                    }


                    if (!type) {

                        throw new Error(
                            `Transaction Type column has an issue in row ${index + 2}. Use only Investment, Withdrawal or Current Value.`
                        );

                    }


                    if (
                        amount === null
                    ) {

                        throw new Error(
                            `Amount column has an issue in row ${index + 2}. Amount must be a positive numeric value.`
                        );

                    }


                    return {
                        date,
                        type,
                        amount
                    };

                }
            );


        /*
         * XLSX-specific rule:
         * Current Value must literally be
         * the final data row in the sheet.
         */
        const currentValueIndex =
            transactions.findIndex(
                function (transaction) {
                    return (
                        transaction.type ===
                        "current value"
                    );
                }
            );


        if (
            currentValueIndex !== -1 &&
            currentValueIndex !==
            transactions.length - 1
        ) {

            throw new Error(
                "Current Value must be the last transaction in your XLSX file."
            );

        }


        return transactions;

    }


    // =========================================================
    // 17. XLSX HEADER VALIDATION
    // =========================================================

    function validateExcelHeaders(
        headers
    ) {

        const expectedHeaders = [
            "date",
            "transaction type",
            "amount"
        ];


        if (
            headers.length !==
            expectedHeaders.length
        ) {

            throw new Error(
                "Please make sure your XLSX file contains only Date, Transaction Type and Amount columns."
            );

        }


        for (
            let index = 0;
            index < expectedHeaders.length;
            index++
        ) {

            if (
                headers[index] !==
                expectedHeaders[index]
            ) {

                throw new Error(
                    "Please make sure your XLSX columns are exactly Date, Transaction Type and Amount."
                );

            }

        }

    }


    // =========================================================
    // 18. NORMALIZE XLSX HEADER
    // =========================================================

    function normalizeHeader(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        return String(value)
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase();

    }


    // =========================================================
    // 19. NORMALIZE TRANSACTION TYPE
    // =========================================================

    function normalizeTransactionType(
        value
    ) {

        if (
            value === null ||
            value === undefined
        ) {

            return null;

        }


        const normalized =
            String(value)
                .trim()
                .replace(/\s+/g, " ")
                .toLowerCase();


        const allowedTypes = [
            "investment",
            "withdrawal",
            "current value"
        ];


        if (
            !allowedTypes.includes(
                normalized
            )
        ) {

            return null;

        }


        return normalized;

    }


    // =========================================================
    // 20. HTML DATE PARSING
    // =========================================================

    function parseDate(
        value
    ) {

        if (!value) {
            return null;
        }


        const date =
            new Date(
                `${value}T00:00:00`
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return null;

        }


        return date;

    }


    // =========================================================
    // 21. EXCEL DATE PARSING
    // =========================================================

    function parseExcelDate(
        value
    ) {

        /*
         * Normal Excel date cell when
         * SheetJS cellDates:true is enabled.
         */
        if (
            value instanceof Date &&
            !Number.isNaN(
                value.getTime()
            )
        ) {

            const date =
                new Date(value);


            date.setHours(
                0,
                0,
                0,
                0
            );


            return date;

        }


        /*
         * Handle Excel numeric serial date
         * as additional protection.
         */
        if (
            typeof value ===
            "number" &&
            Number.isFinite(value)
        ) {

            const parsed =
                XLSX.SSF.parse_date_code(
                    value
                );


            if (parsed) {

                return new Date(
                    parsed.y,
                    parsed.m - 1,
                    parsed.d
                );

            }

        }


        /*
         * Text date fallback.
         */
        if (
            typeof value ===
            "string"
        ) {

            const trimmed =
                value.trim();


            if (!trimmed) {
                return null;
            }


            const parsed =
                new Date(trimmed);


            if (
                !Number.isNaN(
                    parsed.getTime()
                )
            ) {

                parsed.setHours(
                    0,
                    0,
                    0,
                    0
                );


                return parsed;

            }

        }


        return null;

    }


    // =========================================================
    // 22. EXCEL AMOUNT PARSING
    // =========================================================

    function parseExcelAmount(
        value
    ) {

        /*
         * We intentionally accept only
         * actual numeric Excel cells.
         *
         * Examples:
         * 10000    -> accepted
         * ₹10,000  -> rejected if stored as text
         */
        if (
            typeof value !==
            "number"
        ) {

            return null;

        }


        if (
            !Number.isFinite(value) ||
            value <= 0
        ) {

            return null;

        }


        return value;

    }


    // =========================================================
    // 23. XLSX CALCULATE
    // =========================================================

    if (calculateExcelButton) {

        calculateExcelButton.addEventListener(
            "click",
            function () {

                if (
                    !excelTransactions
                ) {

                    showMessage(
                        excelMessage,
                        "Please upload a valid XLSX file first.",
                        "error"
                    );

                    return;

                }


                runCalculation(
                    excelTransactions,
                    excelMessage
                );

            }
        );

    }
	
// =========================================================
// 24. INVESTMENT PERIOD
// =========================================================

function calculateInvestmentPeriodDays(
    transactions
) {

    const dates =
        transactions.map(
            function (transaction) {
                return transaction.date.getTime();
            }
        );


    const earliestDate =
        Math.min(...dates);


    const latestDate =
        Math.max(...dates);


    const millisecondsPerDay =
        1000 * 60 * 60 * 24;


    return Math.round(
        (
            latestDate -
            earliestDate
        ) /
        millisecondsPerDay
    );

}

    // =========================================================
    // 25. RESULT RENDERING
    // =========================================================

  function displayResult(
    xirr,
    summary,
    investmentPeriodDays
) {

    // =====================================================
    // XIRR DISPLAY
    // =====================================================

    const xirrPercentage =
        xirr * 100;


    /*
     * Keep the real calculated XIRR internally.
     *
     * Only cap what is shown on screen so an
     * astronomically large annualized percentage
     * does not destroy the UI.
     */
if (
    xirrPercentage > 10000
) {

    resultXirr.textContent =
        ">10,000%";

} else {

    resultXirr.textContent =
        formatPercent(
            xirrPercentage
        );

}


    // =====================================================
    // SUMMARY
    // =====================================================

    resultInvested.textContent =
        formatCurrency(
            summary.totalInvested
        );


    resultWithdrawn.textContent =
        formatCurrency(
            summary.totalWithdrawn
        );


    resultCurrentValue.textContent =
        formatCurrency(
            summary.currentValue
        );


    resultProfit.textContent =
        formatCurrency(
            summary.absoluteProfit
        );


    resultAbsoluteReturn.textContent =
        formatPercent(
            summary.absoluteReturn
        );


    // =====================================================
    // SHORT-PERIOD WARNING
    // =====================================================

    if (
        investmentPeriodDays < 30
    ) {

        xirrWarning.classList.remove(
            "xirr-hidden"
        );


const displayedPeriodDays =
    Math.max(investmentPeriodDays, 1);

const dayText =
    displayedPeriodDays === 1
        ? "day"
        : "days";


        xirrWarningText.textContent =
            `Your investment history covers only ` +
            `${displayedPeriodDays} ${dayText}. ` +
            `XIRR annualizes returns to a full year, so ` +
            `large gains or losses over very short periods ` +
            `can produce unusually high annualized percentages. ` +
            `Your Absolute Return of ` +
            `${formatPercent(summary.absoluteReturn)} ` +
            `may provide more useful context for this period.`;

    } else {

        xirrWarning.classList.add(
            "xirr-hidden"
        );


        xirrWarningText.textContent =
            "";

    }


    // =====================================================
    // SHOW RESULT
    // =====================================================

    resultCard.classList.remove(
        "xirr-hidden"
    );


    resultCard.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });

}


    // =========================================================
    // 26. FORMATTING
    // =========================================================

    function formatCurrency(
        value
    ) {

        return new Intl.NumberFormat(
            "en-IN",
            {
                style: "currency",
                currency: "INR",
                maximumFractionDigits: 2
            }
        ).format(value);

    }


    function formatPercent(
        value
    ) {

        return (
            new Intl.NumberFormat(
                "en-IN",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            ).format(value)
            +
            "%"
        );

    }


    // =========================================================
    // 27. MESSAGES
    // =========================================================

    function showMessage(
        element,
        message,
        type
    ) {

        if (!element) {
            return;
        }


        element.textContent =
            message;


        element.className =
            `xirr-message ${type}`;

    }


    function clearMessage(
        element
    ) {

        if (!element) {
            return;
        }


        element.textContent =
            "";


        element.className =
            "xirr-message";

    }


    // =========================================================
    // 28. RESULT VISIBILITY
    // =========================================================

    function hideResult() {

        if (!resultCard) {
            return;
        }


        resultCard.classList.add(
            "xirr-hidden"
        );

    }


    // =========================================================
    // 29. MANUAL RESET
    // =========================================================

    if (resetManualButton) {

        resetManualButton.addEventListener(
            "click",
            function () {

                transactionBody.innerHTML =
                    "";


                createTransactionRow();

                createTransactionRow();


                clearMessage(
                    manualMessage
                );


                hideResult();


                updateCurrentValueState();

            }
        );

    }


    // =========================================================
    // 30. XLSX RESET
    // =========================================================

    if (resetExcelButton) {

        resetExcelButton.addEventListener(
            "click",
            function () {

                excelTransactions =
                    null;


                xlsxFileInput.value =
                    "";


                xlsxFileName.textContent =
                    "No file selected";


                clearMessage(
                    excelMessage
                );


                hideResult();

            }
        );

    }


    // =========================================================
    // 31. INITIAL STATE
    // =========================================================

    updateCurrentValueState();

});