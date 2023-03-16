const axios = require("axios").default;
const FormData = require("form-data");
const cheerio = require("cheerio");
const { Readable } = require("stream");

async function imageToWebp(buffer, type = "png") {
	var form = new FormData();
	form.append("new-image", Readable.from(buffer), { filename: `untitled.${type}` });
	var response = await axios.post(`https://ezgif.com/${type}-to-webp`, form);
	var $ = cheerio.load(response.data);
	var url = $("#main > form").attr("action");
	var value = $("#main > form > input[type=hidden]").attr("value");
	form = new FormData();
	form.append("file", value);
	var getUrl = await axios.post(`${url}?ajax=true`, form);
	$ = cheerio.load(getUrl.data);
	url = $("body > table > tbody > tr > td:nth-child(12) > a").attr("href");
	console.log(url);
	return url;
}

async function videoToWebp(buffer) {
	var form = new FormData();
	form.append("new-image", Readable.from(buffer), { filename: `untitled.mp4` });
	var response = await axios.post(`https://ezgif.com/video-to-webp`, form);
	var $ = cheerio.load(response.data);
	var url = $("#main > form").attr("action");
	var value = $("#main > form > input[type=hidden]").attr("value");
	form = new FormData();
	form.append("file", value);
	form.append("start", "0");
	form.append("end", "7");
	form.append("size", "original");
	form.append("fps", "20");
	var getUrl = await axios.post(`https://ezgif.com${url}?ajax=true`, form);
	$ = cheerio.load(getUrl.data);
	url = $("body > table > tbody > tr > td:nth-child(14) > a").attr("href");
	console.log(url);
	return url;
}

module.exports = { imageToWebp, videoToWebp };
