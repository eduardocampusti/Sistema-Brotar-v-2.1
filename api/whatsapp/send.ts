import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Adicionado appointmentId aos campos recebidos (PROMPT 4)
    const { telefone, nome, data, hora, appointmentId } = req.body;

    if (!telefone || !nome || !data || !hora || !appointmentId) {
        return res.status(400).json({ error: 'Missing required fields: telefone, nome, data, hora, appointmentId' });
    }

    let formattedPhone = telefone.replace(/\D/g, '');
    if (formattedPhone.length === 10 || formattedPhone.length === 11) {
        // Assume Brazil country code
        formattedPhone = `55${formattedPhone}`;
    }

    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
    const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
        return res.status(500).json({ error: 'WhatsApp environment variables are not configured' });
    }

    const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

    // Define se deve usar template ou texto simples
    const USE_TEMPLATE = false; // Mudar para true quando o template 'confirmar_agendamento' for aprovado

    const messageBody = USE_TEMPLATE ? {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "template",
        template: {
            name: "confirmar_agendamento",
            language: { code: "pt_BR" },
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: nome },
                        { type: "text", text: data },
                        { type: "text", text: hora }
                    ]
                },
                {
                    type: "button",
                    sub_type: "quick_reply",
                    index: "0",
                    parameters: [{ type: "payload", payload: appointmentId }]
                },
                {
                    type: "button",
                    sub_type: "quick_reply",
                    index: "1",
                    parameters: [{ type: "payload", payload: appointmentId }]
                }
            ]
        }
    } : {
        messaging_product: "whatsapp",
        to: formattedPhone,
        type: "interactive",
        interactive: {
            type: "button",
            body: {
                text: `Olá ${nome}! Seu agendamento foi confirmado:\n\n📅 *Data:* ${data}\n⏰ *Horário:* ${hora}\n\nPor favor, confirme seu comparecimento.`
            },
            footer: {
                text: "Sistema Brotar"
            },
            action: {
                buttons: [
                    {
                        type: "reply",
                        reply: {
                            id: `CONFIRM_${appointmentId}`,
                            title: "Confirmar"
                        }
                    },
                    {
                        type: "reply",
                        reply: {
                            id: `CANCEL_${appointmentId}`,
                            title: "Cancelar"
                        }
                    }
                ]
            }
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messageBody),
        });

        const dataResponse = await response.json();

        if (!response.ok) {
            console.error('Meta API Error:', dataResponse);
            return res.status(response.status).json(dataResponse);
        }

        return res.status(200).json(dataResponse);

    } catch (error: any) {
        console.error('Fetch Error:', error);
        return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
