/**
 * WhatsApp Helper & Messaging Service
 * Formats phones and builds direct wa.me links with URL encoding
 */

export function normalizePhone(phone: string): string {
  if (!phone) return '';
  // Remove all non-digits
  const clean = phone.replace(/\D/g, '');
  if (!clean) return '';
  // If it doesn't start with 55 and has 10 or 11 digits (Brazilian phone), add country code 55
  if (clean.length >= 10 && clean.length <= 11 && !clean.startsWith('55')) {
    return `55${clean}`;
  }
  return clean;
}

export function buildWhatsAppLink(phone: string, text: string): string {
  const cleanPhone = normalizePhone(phone);
  const encodedText = encodeURIComponent(text);
  if (!cleanPhone) {
    return `https://wa.me/?text=${encodedText}`;
  }
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

export const WhatsAppService = {
  /**
   * Confirmation message after appointment creation
   */
  sendBookingConfirmation(data: {
    clientName: string;
    clientPhone: string;
    serviceName: string;
    professionalName: string;
    dateFormatted: string; // e.g. 10/08/2026
    time: string; // 14:00
    priceFormatted: string; // R$ 55,00
  }) {
    const message = `Olá, ${data.clientName}! 👋

Seu horário foi agendado com sucesso.

📅 Data: ${data.dateFormatted}
⏰ Horário: ${data.time}
✂️ Serviço: ${data.serviceName}
👤 Profissional: ${data.professionalName}
💰 Valor: ${data.priceFormatted}

Aguardamos você!

Caso precise reagendar, fale conosco.`;

    return buildWhatsAppLink(data.clientPhone, message);
  },

  /**
   * Reminder message for upcoming appointment
   */
  sendBookingReminder(data: {
    clientName: string;
    clientPhone: string;
    serviceName: string;
    professionalName: string;
    time: string;
    dateLabel?: string; // e.g. "Amanhã" or "Hoje"
  }) {
    const message = `Olá, ${data.clientName}! 👋

Passando para lembrar do seu horário:

📅 ${data.dateLabel || 'Amanhã'}
⏰ ${data.time}
✂️ ${data.serviceName}
👤 ${data.professionalName}

Caso precise reagendar, fale conosco.

Até breve! 😊`;

    return buildWhatsAppLink(data.clientPhone, message);
  },

  /**
   * Cancellation message generator
   */
  sendCancellation(data: {
    clientName: string;
    clientPhone: string;
    serviceName: string;
    dateFormatted: string;
    time: string;
  }) {
    const message = `Olá! Gostaria de confirmar o cancelamento do seu agendamento:

Cliente: ${data.clientName}
Data: ${data.dateFormatted}
Horário: ${data.time}
Serviço: ${data.serviceName}

Caso queira reagendar para outro dia, estamos à disposição!`;

    return buildWhatsAppLink(data.clientPhone, message);
  },

  /**
   * Reschedule message
   */
  sendReschedule(data: {
    clientName: string;
    clientPhone: string;
    newDateFormatted: string;
    newTime: string;
    serviceName: string;
  }) {
    const message = `Olá, ${data.clientName}! 👋

Seu agendamento para ${data.serviceName} foi reagendado com sucesso!

Novo horário:
📅 ${data.newDateFormatted} às ⏰ ${data.newTime}

Qualquer dúvida, fale conosco!`;

    return buildWhatsAppLink(data.clientPhone, message);
  },

  /**
   * Birthday greeting
   */
  sendBirthdayMessage(data: { clientName: string; clientPhone: string }) {
    const message = `Olá, ${data.clientName}! 🎉

Desejamos um feliz aniversário! 🥳✨

Quando quiser, estamos esperando você para aquele cuidado especial com um presente surpresa em seu próximo atendimento. ❤️`;

    return buildWhatsAppLink(data.clientPhone, message);
  },

  /**
   * Inactive client return invitation
   */
  sendReturnReminder(data: {
    clientName: string;
    clientPhone: string;
    bookingLink: string;
  }) {
    const message = `Olá, ${data.clientName}! 👋

Sentimos sua falta por aqui! 💇‍♂️✨

Que tal agendar novamente para renovar o visual?

Agende em 1 clique:
${data.bookingLink}`;

    return buildWhatsAppLink(data.clientPhone, message);
  },

  /**
   * Loyalty Reward Completed
   */
  sendLoyaltyReward(data: {
    clientName: string;
    clientPhone: string;
    rewardDescription: string;
    bookingLink: string;
  }) {
    const message = `🎉 Parabéns, ${data.clientName}!

Você completou seu cartão fidelidade! 🏆

🎁 Sua Recompensa:
${data.rewardDescription}

Agende seu horário e resgate seu prêmio:
${data.bookingLink}

Esperamos você! ❤️`;

    return buildWhatsAppLink(data.clientPhone, message);
  },

  /**
   * Loyalty almost there (e.g. 9/10)
   */
  sendLoyaltyCloseReminder(data: {
    clientName: string;
    clientPhone: string;
    currentStamps: number;
    requiredStamps: number;
    bookingLink: string;
  }) {
    const message = `Olá, ${data.clientName}! 👋

Você está quase lá! 🔥

Seu cartão fidelidade está em:
${data.currentStamps}/${data.requiredStamps} ⭐

Falta apenas 1 atendimento para sua recompensa! 🎁

Agende seu próximo horário:
${data.bookingLink}`;

    return buildWhatsAppLink(data.clientPhone, message);
  },

  /**
   * Share Online Booking Link
   */
  sendLoyaltyProgress(data: {
    clientName: string;
    clientPhone: string;
    currentStamps: number;
    targetStamps: number;
    rewardDescription: string;
  }) {
    const message = `Olá, ${data.clientName}! 👋\n\nSeu cartão fidelidade foi atualizado!\n\n⭐ Selos acumulados: ${data.currentStamps}/${data.targetStamps}\n🎁 Prêmio: ${data.rewardDescription}\n\nObrigado por sua preferência!`;
    return buildWhatsAppLink(data.clientPhone, message);
  },

  shareBookingLink(data: {
    businessName: string;
    bookingLink: string;
    phone?: string;
  }) {
    const message = `💈 Agende seu horário na ${data.businessName}!

Escolha seu serviço e horário preferido diretamente online:
${data.bookingLink}`;

    return buildWhatsAppLink(data.phone || '', message);
  },

  /**
   * Welcome & WhatsApp confirmation for newly registered barbershop owner
   */
  sendOwnerWelcomeNotification(data: {
    ownerName: string;
    ownerPhone: string;
    businessName: string;
    planName: string;
    email: string;
    bookingUrl: string;
  }) {
    const message = `✂️ *CONFIRMAÇÃO DE CADASTRO - STUDIOFLOW* 💈

Olá, *${data.ownerName}*!
Sua barbearia *${data.businessName}* foi cadastrada com sucesso na nossa plataforma!

📋 *Resumo da Sua Assinatura:*
• *Estabelecimento:* ${data.businessName}
• *Proprietário:* ${data.ownerName}
• *Plano Ativado:* ${data.planName} (14 Dias de Teste Grátis Ativado)
• *WhatsApp do Administrador:* ${data.ownerPhone}
• *E-mail de Acesso:* ${data.email}

🔗 *Link do Agendamento dos seus Clientes:*
${data.bookingUrl}

Seu painel administrativo já está 100% liberado e ativo! Seja bem-vindo e ótimos negócios!🚀`;

    return buildWhatsAppLink(data.ownerPhone, message);
  },
};
