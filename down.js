const fs = require('fs')
const { Base64Decode } = require("base64-stream");
const Imap = require('imap')



function toUpper(thing) { return thing && thing.toUpperCase ? thing.toUpperCase() : thing }

function findAttachmentParts(struct, attachments) {
    attachments = attachments || []
    struct.forEach((i) => {
        if (Array.isArray(i)) findAttachmentParts(i, attachments)
        else if (i.disposition && ['INLINE', 'ATTACHMENT'].indexOf(toUpper(i.disposition.type)) > -1) {
            attachments.push(i)
        }
    })
    return attachments
}

const downloadAttach = (email, pass, sender, date) => {
    const imap = new Imap({
        user: email,
        password: pass,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
        /*debug: (msg) => {console.log('imap:', msg);} */
    });

    imap.once('ready', () => {
        // A4 EXAMINE "INBOX"
        imap.openBox('INBOX', true, (err, box) => {
            if (err) throw err;
            imap.search(['ALL', ['FROM', sender], ['SINCE', date]], (err, results) => {
                if (err) throw err;
                const f = imap.seq.fetch(results, {
                    bodies: ['HEADER.FIELDS (SUBJECT)'],
                    struct: true  // BODYSTRUCTURE
                })
                f.on('message', (msg, seqno) => {
                    console.log('Message #%d', seqno)
                    const prefix = `(#${seqno})`
                    var header = null
                    msg.on('body', (stream, info) => {
                        var buffer = ''
                        stream.on('data', (chunk) => { buffer += chunk.toString('utf8') });
                        stream.once('end', () => { header = Imap.parseHeader(buffer) })
                    });
                    msg.once('attributes', (attrs) => {
                        const attachments = findAttachmentParts(attrs.struct);
                        console.log(`${prefix} uid=${attrs.uid} Has attachments: ${attachments.length}`);
                        attachments.forEach((attachment) => {
                            /* 
                              RFC2184 MIME Parameter Value and Encoded Word Extensions
                                      4.Parameter Value Character Set and Language Information
                              RFC2231 Obsoletes: 2184
                              {
                                partID: "2",
                                type: "image",
                                subtype: "jpeg",
                                params: {
                        X         "name":"________20.jpg",
                                  "x-apple-part-url":"8C33222D-8ED9-4B10-B05D-0E028DEDA92A"
                                },
                                id: null,
                                description: null,
                                encoding: "base64",
                                size: 351314,
                                md5: null,
                                disposition: {
                                  type: "inline",
                                  params: {
                        V           "filename*":"GB2312''%B2%E2%CA%D4%B8%BD%BC%FE%D2%BB%5F.jpg"
                                  }
                                },
                                language: null
                              }   */
                            console.log(`${prefix} Fetching attachment ${attachment.params.name}`)
                            console.log(attachment.disposition.params.filename)
                            const filename = attachment.params.name  // need decode disposition.params['filename*'] !!!
                            const encoding = toUpper(attachment.encoding)
                            // A6 UID FETCH {attrs.uid} (UID FLAGS INTERNALDATE BODY.PEEK[{attachment.partID}])
                            const f = imap.fetch(attrs.uid, { bodies: [attachment.partID] })
                            f.on('message', (msg, seqno) => {
                                const prefix = `(#${seqno})`
                                msg.on('body', (stream, info) => {
                                    const writeStream = fs.createWriteStream(filename);
                                    writeStream.on('finish', () => { console.log(`${prefix} Done writing to file ${filename}`) })
                                    if (encoding === 'BASE64') stream.pipe(new Base64Decode()).pipe(writeStream);
                                    else stream.pipe(writeStream)
                                })
                                msg.once('end', () => { console.log(`${prefix} Finished attachment file${filename}`) })
                            })
                            f.once('end', () => { console.log('WS: downloder finish') })
                        })
                    })
                    msg.once('end', () => { console.log(`${prefix} Finished email`); })
                });

                // A5 FETCH 1:3 (UID FLAGS INTERNALDATE BODYSTRUCTURE BODY.PEEK[HEADER.FIELDS (SUBJECT DATE)])

                f.once('error', (err) => { console.log(`Fetch error: ${err}`) })
                f.once('end', () => {
                    console.log('Done fetching all messages!')
                    imap.end()
                })
            })
        })
    })
    imap.once('error', (err) => { console.log(err) })
    imap.once('end', () => { console.log('Connection ended') })
    imap.connect()
}

module.exports.downloadAttach = downloadAttach;