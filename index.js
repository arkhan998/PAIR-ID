/**
 * DULHAN-MD - Direct Pairing Code & Session ID Generator
 * This script generates a pairing code directly in the terminal.
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

    const { state, saveCreds } = await useMultiFileAuthState('temp_auth_state');
    
    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
            console.log('\n✅ Connection Successful! Generating and sending Session ID...');
            
            const creds = JSON.stringify(state.creds, null, 2);
            const sessionId = Buffer.from(creds).toString('base64');
            const sessionMessage = `*DULHAN-MD SESSION ID:*\n\n\`\`\`${sessionId}\`\`\`\n\n*Warning:* Is ID ko kisi ke saath share na karein! Isko apni config.js file mein paste kar lein.`;
            
            await sock.sendMessage(sock.user.id, { text: sessionMessage });
            
            console.log('\n✅ Session ID has been sent to your WhatsApp!');
            console.log('You can now close this generator.');
            
            if (fs.existsSync('./temp_auth_state')) {
                fs.rmSync('./temp_auth_state', { recursive: true, force: true });
            }
            process.exit(0);
        }

        if (connection === 'close') {
            const reason = DisconnectReason[lastDisconnect.error?.output?.statusCode] || 'Unknown';
            console.error(`\n❌ Connection Closed. Reason: ${reason}. Please try again.`);
            process.exit(1);
        }
    });

    if (!sock.authState.creds.registered) {
        const phoneNumber = await question('Please enter your WhatsApp number with country code (e.g., 92...): ');
        try {
            const code = await sock.requestPairingCode(phoneNumber);
            console.log("\n========================================");
            console.log(`   YOUR PAIRING CODE: ${code}`);
            console.log("========================================");
            console.log("\nPlease enter this code in your phone quickly.");
        } catch (e) {
            console.error("Failed to request pairing code. Please make sure the phone number is correct.", e);
            process.exit(1);
        }
    }

    sock.ev.on('creds.update', saveCreds);
}

generateSession().catch(e => console.error("An error occurred:", e));
