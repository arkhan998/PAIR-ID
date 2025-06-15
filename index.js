/**
 * DULHAN-MD - Simple QR Code Session Generator
 * This script uses the most reliable method (QR code) to generate a session.
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

async function generateSession() {
    console.log("========================================");
    console.log("   👰‍♀️ DULHAN-MD QR SESSION GENERATOR 👰‍♀️  ");
    console.log("========================================");

    const { state, saveCreds } = await useMultiFileAuthState('temp_auth_state');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false // Hum isko khud handle karenge
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update;

        if (qr) {
            console.log("\nQR Code Generated. Please scan it with your WhatsApp.");
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'open') {
            console.log('\n✅ Connection successful!');
            await sock.sendMessage(sock.user.id, { text: 'Session ID generate ho rahi hai...' });
            
            const creds = JSON.stringify(state.creds, null, 2);
            const sessionId = Buffer.from(creds).toString('base64');
            
            const sessionMessage = `*DULHAN-MD SESSION ID:*\n\n\`\`\`${sessionId}\`\`\`\n\n*Warning:* Is ID ko kisi ke saath share na karein!`;
            await sock.sendMessage(sock.user.id, { text: sessionMessage });
            
            console.log('\n✅ Session ID has been sent to your WhatsApp!');
            console.log('You can now close this generator.');
            
            if (fs.existsSync('./temp_auth_state')) {
                fs.rmSync('./temp_auth_state', { recursive: true, force: true });
            }
            process.exit(0);
        }

        if (connection === 'close') {
            console.log('\n❌ Connection Closed. Restarting...');
            generateSession();
        }
    });

    // Save creds whenever they are updated
    sock.ev.on('creds.update', saveCreds);
}

generateSession().catch(e => console.error("An error occurred:", e));
