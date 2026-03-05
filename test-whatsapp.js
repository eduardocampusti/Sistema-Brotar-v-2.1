const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function testWhatsApp() {
    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
    const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

    // NÚMERO DE TESTE (Troque pelo seu número com DDI 55)
    const RECIPIENT = "5511987654321"; // Coloque um número aqui para teste real se desejar

    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
        console.error("❌ Erro: Chaves WHATSAPP_TOKEN ou PHONE_NUMBER_ID não encontradas no .env.local");
        return;
    }

    const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

    const messageBody = {
        messaging_product: "whatsapp",
        to: RECIPIENT,
        type: "template",
        template: {
            name: "confirmar_agendamento",
            language: { code: "pt_BR" },
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: "ALUNO TESTE" },
                        { type: "text", text: "01/01/2026" },
                        { type: "text", text: "10:00" }
                    ]
                },
                {
                    type: "button",
                    sub_type: "quick_reply",
                    index: "0",
                    parameters: [{ type: "payload", payload: `CONFIRM_TEST` }]
                },
                {
                    type: "button",
                    sub_type: "quick_reply",
                    index: "1",
                    parameters: [{ type: "payload", payload: `RESCHEDULE_TEST` }]
                },
                {
                    type: "button",
                    sub_type: "quick_reply",
                    index: "2",
                    parameters: [{ type: "payload", payload: `CANCEL_TEST` }]
                }
            ]
        }
    };

    console.log("🚀 Enviando requisição para Meta...");
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messageBody),
        });

        const data = await response.json();
        console.log("📊 Status HTTP:", response.status);
        console.log("📄 Resposta da Meta:", JSON.stringify(data, null, 2));

        if (response.ok) {
            console.log("✅ Requisição aceita pela Meta!");
        } else {
            console.error("❌ Erro retornado pela Meta.");
        }
    } catch (error) {
        console.error("💥 Erro técnico na requisição:", error);
    }
}

testWhatsApp();
