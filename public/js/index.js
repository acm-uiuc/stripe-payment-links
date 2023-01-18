function isURL(str) {
    const pattern = new RegExp('^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}'+
    '(:[0-9]{1,5})?(\/.*)?|^((http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)'+
    '?([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$', 'i');
    return !!pattern.test(str);
}
async function getRandomURL() {
    const response = await fetch(`/getRandomURL`, {
        method: "GET"
    })
    let resp = {}
    try {
        resp = await response.json()
    } catch {
        alert("Could not generate a random URL. Please, try again.")
        return
    }
    if (response.status === 200 && resp.success === true) {
        document.getElementById("name").value = resp.generatedURL
    } else {
        alert("Could not generate a random URL. Please, try again.")
        return
    }
}
async function getGroups() {
    const checkboxes = document.getElementsByTagName('input');
    let selectedGroups = [];
    for (let i = 0; i < checkboxes.length; i++)  {
        if (checkboxes[i].type == 'checkbox' && checkboxes[i].checked) {
            selectedGroups.push(checkboxes[i].id.slice(0, -6)); 
        }
    }
    return selectedGroups;
}
async function submitData() {
    const url = document.getElementById("url").value
    if (!isURL(url)) {
        alert("The URL is not valid. Please input a new URL")
        return
    }
    const name = document.getElementById("name").value
    if (name === "") {
        alert("Please enter a short URL")
        return
    }
    const groups = await getGroups()
    const response = await fetch(`/addURL?url=${btoa(url)}&name=${name}`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({groups: groups})
    })
    if (response.status === 200) {
        alert("Link shortened successfully!")
    } else {
        const resp = await response.json();
        alert(resp.message)
    }
}