/**
 * DULHAN-MD Pairing Code & Session ID Generator
 * This script reliably generates a valid Base64 Session ID.
 */

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function generateSession() {
    console.log("========================================");
    console.log("   👰‍♀️ DULHAN-MD SESSION GENERATOR 👰‍♀️   ");
    console.log("========================================");

    // temp_auth_state folder banayein taake session files save hon
    const { state, saveCreds } = await useMultiFileAuthState('temp_auth_state');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false // Hum pairing code istemal kar rahe hain
    });

    // Connection ki logic
    sock.ev.on('connection.update', async (update) => {
        const { connection } = update;

        if (connection === 'open') {
            console.log('\n✅ Connection successful!');
            console.log('Generating your Session ID...');

            await sock.sendMessage(sock.user.id, { text: 'Session ID generate ho rahi hai, ek minute...' });
            
            // Asal Session ID (Base64 format mein)
            const creds = JSON.stringify(state.creds, null, 2);
            const sessionId = Buffer.from(creds).toString('base64');
            
            const sessionMessage = `*DULHAN-MD SESSION ID:*\n\n\`\`\`${sessionId}\`\`\`\n\n*Warning:* Is ID ko kisi ke saath share na karein! Isko apni config.js file mein paste kar lein.`;

            await sock.sendMessage(sock.user.id, { text: sessionMessage });
            
            console.log('\n✅ Session ID aapke WhatsApp number par bhej di gayi hai!');
            console.log('Aap ab is window ko band kar sakte hain.');
            
            // Safai (Cleanup)
            if (fs.existsSync('./temp_auth_state')) {
                fs.rmSync('./temp_auth_state', { recursive: true, force: true });
            }
            process.exit(0);
        }

        if (connection === 'close') {
            console.log('\n❌ Connection closed. Please try again.');
            process.exit(1);
        }
    });

    // Pairing code ki logic
    if (!sock.authState.creds.registered) {
        const phoneNumber = await question('Please enter your WhatsApp number with country code (e.g., 92...): ');
        try {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log(`\nYour Pairing Code is: ${code}`);
            console.log("Is code ko apne phone mein WhatsApp > Linked Devices > Link with phone number mein daalein.");
        } catch (e) {
            console.error("Pairing code generate karne mein masla aa gaya. Number theek hai?", e);
            process.exit(1);
        }
    }
}

generateSession().catch(e => console.error("Ek unexpected error aa gaya:", e));
