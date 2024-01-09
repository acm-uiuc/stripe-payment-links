async function submitData() {
    document.getElementById("submit").disabled = true;
    const dataitems = ['amnt', 'invoice', 'contactName', 'contactEmail']
    let bodyconst = {}
    for (const item of dataitems) {
        const it = document.getElementById(item).value
        if (!it) {
            alert(`${item} field is not valid. Please input a new URL`)
        }
        bodyconst[item] = it
    }
    bodyconst['amnt'] = parseFloat(bodyconst['amnt'])
    const response = await fetch(`/paylink`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyconst)
    })
    const resp = await response.json();
    alert(resp.message)
    document.getElementById("submit").disabled = false;
}