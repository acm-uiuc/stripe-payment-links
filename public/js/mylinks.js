function isURL(str) {
    const expression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi;
    const regex = new RegExp(expression);
    try {
        return str.match(regex)   
    } catch {
        return false;
    }

}
async function handleEdit(name, url) {
    let newURL;
    while (!isURL(newURL)) {
        newURL = prompt("Please enter a valid new URL", url);
        if (newURL === null) {
            return
        }
    }
    const response = await fetch(`/updateLink?name=${name}&url=${btoa(newURL)}`, {
        method: "PUT"
    })
    if (response.status !== 200) {
        alert(parsed.message)
    } else  {
        alert(`URL changed to ${newURL}!`)
        document.getElementById(`urldata-${name}-url`).innerHTML = newURL
        document.getElementById(`urldata-${name}-url`).href = newURL
    }
}