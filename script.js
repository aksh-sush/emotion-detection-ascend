document.getElementById("submit").addEventListener("click", async function(event) {
    event.preventDefault();
    const eventData = {
        "timestamp": document.getElementById("time").value,
        "machine-feelin": document.getElementById("machine-feelin").value,
        "rate": parseFloat(document.getElementById("rate").value),
        "user-tag": document.getElementById("user-tag").value
    };

    // // get the song
    // const songResponse = await fetch("http://127.0.0.1:5000/songrecom", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify(eventData)
    // });
    // const songData = await songResponse.json();
    // document.getElementById("result").textContent = songData;

    // get the explanation
    const explainResponse = await fetch("http://127.0.0.1:5000/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData)
    });
    const explainData = await explainResponse.json();
    document.getElementById("explanation").textContent = explainData.reason;

    const songData = await songResponse.json();
    document.getElementById("result").textContent = songData;
});