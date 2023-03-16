const { default: axios } = require("axios");
const { load } = require("cheerio");

async function apk4all(query) {
    var res = await axios.get(`https://apk4all.io/search/${query}`);
    var html = load(res.data);
    var id = html("#main").children()[1]?.attribs?.id;
    var title = html(`#${id} > div > header > h3 > a`).text();
    var image = html(`#${id} > div > dl > dt > div > img`).attr("src");
    var link = html(`#${id} > div > header > h3 > a`).attr("href");

    if (!id) return false;

    res = await axios.get(link);
    html = load(res.data);
    link = html(`#${id} > div > div.entry-content > div.app-footer > div.dllinks > a`).attr("href");

    res = await axios.get(link);
    html = load(res.data);
    var count = html(`body > section > div > div > div > div > div`).children().length - 4;
    link = [];
    for (let i = 0; i < count; i++) {
        let name = html(`body > section > div > div > div > div > div > div:nth-child(${i + 1}) > p.control.is-expanded > a`).text();
        let linkk = html(`body > section > div > div > div > div > div > div:nth-child(${i + 1}) > p.control.is-expanded > a`).attr("href");
        link.push({ name, link: linkk });
    }
    return { title, image, link };
}

module.exports = { apk4all };
