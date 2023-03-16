const { default: WASocket, fetchLatestBaileysVersion, useMultiFileAuthState, DisconnectReason, Browsers, jidNormalizedUser } = require("@adiwajshing/baileys");
const Pino = require("pino");
const { Boom } = require("@hapi/boom");
const sessionName = "sessions";
const { serialize } = require("./lib/serialize.js");
const { imageToWebp, videoToWebp } = require("./lib/ezgif.js");
const FileType = require("file-type");
const Jimp = require("jimp");
const { apk4all } = require("./lib/apk4all.js");

const connect = async () => {
    const { state, saveCreds } = await useMultiFileAuthState(`./session/${sessionName}-session`);
    const { version } = await fetchLatestBaileysVersion();

    const client = WASocket({
        printQRInTerminal: true,
        auth: state,
        logger: Pino({ level: "silent" }),
        browser: Browsers.macOS("Desktop"),
        syncFullHistory: true,
        version,
        markOnlineOnConnect: false,
    });

    client.ev.on("creds.update", saveCreds);

    client.ev.on("connection.update", async (up) => {
        const { lastDisconnect, connection, qr } = up;
        if (connection) {
            console.log(`Connection Status: ${connection}`);
        }

        if (connection === "close") {
            let reason = new Boom(lastDisconnect.error).output.statusCode;
            if (reason === DisconnectReason.badSession) {
                console.log(`Bad Session File, Please Delete ./session/${sessionName}-session and Scan Again`);
                client.logout();
            } else if (reason === DisconnectReason.connectionClosed) {
                console.log("Connection closed, reconnecting....");
                connect();
            } else if (reason === DisconnectReason.connectionLost) {
                console.log("Connection Lost from Server, reconnecting...");
                connect();
            } else if (reason === DisconnectReason.connectionReplaced) {
                console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First");
                client.logout();
            } else if (reason === DisconnectReason.loggedOut) {
                console.log(`Device Logged Out, Please Delete ./session/${sessionName}-session and Scan Again.`);
                client.logout();
            } else if (reason === DisconnectReason.restartRequired) {
                console.log("Restart Required, Restarting...");
                connect();
            } else if (reason === DisconnectReason.timedOut) {
                console.log("Connection TimedOut, Reconnecting...");
                connect();
            } else {
                client.end(new Error(`Unknown DisconnectReason: ${reason}|${lastDisconnect.error}`));
            }
        }
    });

    // messages.upsert
    client.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;
        const m = await serialize({ ...messages[0] }, client);
        if (!m.isSelf) return;

        console.log(m.body)
        switch (m.body) {
            case "s": {
                let buffer = await (m.quoted || m).download();
                var filetype = await FileType.fromBuffer(buffer);

                if (m.typeCheck.isImage || m.typeCheck.isQuotedImage) {
                    var url = await imageToWebp(buffer, filetype.ext);
                    client.sendMessage(m.from, { sticker: { url } });
                } else if (m.typeCheck.isVideo || m.typeCheck.isQuotedVideo) {
                    var url = await videoToWebp(buffer);
                    client.sendMessage(m.from, { sticker: { url } });
                } else if (m.typeCheck.isSticker || m.typeCheck.isQuotedSticker) {
                    client.sendMessage(m.from, { sticker: buffer });
                }

                break;
            }
            case "setpp": {
                var res = await (m.quoted || m).download();
                if (!Buffer.isBuffer(res)) return;
                res = await reSize(res, 720, 720);
                await client.query({
                    tag: "iq",
                    attrs: {
                        to: jidNormalizedUser(client.user.id),
                        type: "set",
                        xmlns: "w:profile:picture",
                    },
                    content: [
                        {
                            tag: "picture",
                            attrs: { type: "image" },
                            content: res,
                        },
                    ],
                });
                break;
            }
            case "setppfull": {
                var res = await (m.quoted || m).download();
                if (!Buffer.isBuffer(res)) return;
                res = await reSize(res, 1280, 720);
                await client.query({
                    tag: "iq",
                    attrs: {
                        to: jidNormalizedUser(client.user.id),
                        type: "set",
                        xmlns: "w:profile:picture",
                    },
                    content: [
                        {
                            tag: "picture",
                            attrs: { type: "image" },
                            content: res,
                        },
                    ],
                });
                break;
            }
            default: {
                if (m?.body?.startsWith("apk4all ")) {
                    var text = m.body.split(/ +/).slice(1).join(" ");
                    var res = await apk4all(text);
                    if (!res) return m.reply("Err..");
                    text = res.link.map((v, i) => {
                        return [`*Name:* ${v.name}`, `*Link:* ${v.link}\n`].join("\n");
                    });
                    m.reply(text);
                }
            }
        }
    });
};

connect();

async function reSize(media, h, w) {
    const jimp = await Jimp.read(media);
    const min = jimp.getWidth();
    const max = jimp.getHeight();
    const cropped = jimp.crop(0, 0, min, max);
    return await cropped.scaleToFit(h, w).getBufferAsync(Jimp.MIME_JPEG);
}
