/**
 * Shared helper for sending SMS via httpSMS.
 * Documentation: https://docs.httpsms.com/api-reference/send-message
 */

// Ambient declaration for IDE support outside native Deno toolchains
declare const Deno: any;

export async function sendSMS(to: string, content: string): Promise<boolean> {
  const apiKey = Deno.env.get('HTTPSMS_API_KEY');
  const from = Deno.env.get('HTTPSMS_FROM_NUMBER');

  if (!apiKey || !from) {
    console.error('Missing HTTPSMS_API_KEY or HTTPSMS_FROM_NUMBER environment variables.');
    return false;
  }

  try {
    const response = await fetch('https://api.httpsms.com/v1/messages/send', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: content,
        from: from,
        to: to
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`httpSMS error: ${response.status} - ${errBody}`);
      return false;
    }

    const data = await response.json();
    console.log(`SMS sent successfully to ${to}. Message ID: ${data.data?.id}`);
    return true;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return false;
  }
}
