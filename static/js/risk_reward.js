document.addEventListener("DOMContentLoaded", function () {

    const direction = document.getElementById("rrDirection");

    const entryInput = document.getElementById("rrEntry");
    const stopInput = document.getElementById("rrStop");
    const targetInput = document.getElementById("rrTarget");

    const calculateButton = document.getElementById("rrCalculate");
    const resetButton = document.getElementById("rrReset");

    const ratioResult = document.getElementById("rrRatio");
    const messageResult = document.getElementById("rrMessage");
    const riskResult = document.getElementById("rrRisk");
    const rewardResult = document.getElementById("rrReward");
    const stopPercentResult = document.getElementById("rrStopPercent");
    const breakEvenResult = document.getElementById("rrBreakEven");


    function formatNumber(value) {
        return Number(value).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }


    calculateButton.addEventListener("click", function () {

        const entry = parseFloat(entryInput.value);
        const stop = parseFloat(stopInput.value);
        const target = parseFloat(targetInput.value);

        if (
            !Number.isFinite(entry) ||
            !Number.isFinite(stop) ||
            !Number.isFinite(target) ||
            entry <= 0 ||
            stop <= 0 ||
            target <= 0
        ) {
            alert("Please enter valid entry, stop loss and target values.");
            return;
        }


        let risk;
        let reward;


        if (direction.value === "long") {

            risk = entry - stop;
            reward = target - entry;

            if (risk <= 0 || reward <= 0) {
                alert(
                    "For a long trade, stop loss must be below entry and target must be above entry."
                );
                return;
            }

        } else {

            risk = stop - entry;
            reward = entry - target;

            if (risk <= 0 || reward <= 0) {
                alert(
                    "For a short trade, stop loss must be above entry and target must be below entry."
                );
                return;
            }
        }


        const rewardRatio = reward / risk;

        const breakEvenWinRate =
            (risk / (risk + reward)) * 100;

        const stopDistancePercent =
            (risk / entry) * 100;


        ratioResult.textContent =
            `1 : ${formatNumber(rewardRatio)}`;

        messageResult.textContent =
            `For every ₹1 risked, the planned reward is ₹${formatNumber(rewardRatio)}.`;

        riskResult.textContent =
            `${formatNumber(risk)} points`;

        rewardResult.textContent =
            `${formatNumber(reward)} points`;

        stopPercentResult.textContent =
            `${formatNumber(stopDistancePercent)}%`;

        breakEvenResult.textContent =
            `${formatNumber(breakEvenWinRate)}%`;
    });


    resetButton.addEventListener("click", function () {

        direction.selectedIndex = 0;

        entryInput.value = "";
        stopInput.value = "";
        targetInput.value = "";

        ratioResult.textContent = "—";

        messageResult.textContent =
            "Enter your planned trade setup.";

        riskResult.textContent = "—";
        rewardResult.textContent = "—";
        stopPercentResult.textContent = "—";
        breakEvenResult.textContent = "—";
    });

});