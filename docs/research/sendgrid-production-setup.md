# SendGrid production setup

Research scope: verifying `willakins23@gmail.com` as a Single Sender, creating a least-privilege API key for sending mail, and understanding the production tradeoffs. Sources are current official Twilio SendGrid documentation.

## Immediate setup with Gmail

1. In the SendGrid console, go to **Settings → Sender Authentication**.
2. Under **Single Sender Verification**, select **Verify a Single Sender**.
3. Enter `willakins23@gmail.com` as the **From Email Address**, complete every required sender/contact field, and set a monitored **Reply To** address.
4. Select **Create**, open the verification message sent to the Gmail inbox, and follow its verification link.
5. Keep the application's From address exactly aligned with this verified address. Single Sender Verification authorizes only the individual address that was verified.

Twilio documents these console steps and required fields in [Authenticate a single sender](https://www.twilio.com/docs/sendgrid/ui/sending-email/sender-verification). A new free account must verify a Single Sender before it can send; in some cases, SendGrid's compliance review can take up to 72 hours after account verification is complete ([Verifying your Account](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/verifying-your-account)).

## Least-privilege API key

1. Go to **Settings → API Keys** and select **Create API Key**.
2. Give it a production-specific name, such as `Campus Cats Firebase production`.
3. Choose **Restricted Access** (shown as **Custom Access** in some SendGrid documentation/UI versions).
4. Grant **Mail Send** full access and leave unrelated permissions disabled.
5. Select **Create & View**, copy the key immediately, and store it only in the production secret store used by the Firebase Functions deployment.

SendGrid displays the API key only once, recommends treating it like a password, and says not to commit it to a repository. Keys can be revoked independently and scoped to limited actions. SendGrid's Node.js quickstart specifically instructs users to grant only **Mail Send → Full Access**. See [API Keys](https://www.twilio.com/docs/sendgrid/ui/account-and-settings/api-keys), [Create API keys](https://www.twilio.com/docs/sendgrid/api-reference/api-keys/create-api-keys), and the [Node.js quickstart](https://www.twilio.com/docs/sendgrid/for-developers/sending-email/quickstart-nodejs).

## Production caveat and recommended follow-up

A Gmail Single Sender is suitable as a short-term testing/initial setup path, but it is not SendGrid's recommended production identity:

- Twilio says Single Sender Verification is for testing and recommends Domain Authentication before production sending.
- Twilio specifically warns that addresses from large inbox providers can fail DMARC checks.
- Domain Authentication requires control of a domain's DNS and adds the SendGrid-provided records. It improves deliverability and sender reputation and authorizes any From address on the authenticated domain.

Therefore, use the verified Gmail sender only as an interim solution. Before relying on onboarding or invitation email in production, obtain a Campus Cats-controlled domain, configure Domain Authentication, and change the application's From address to that authenticated domain. See [Sender Identity](https://www.twilio.com/docs/sendgrid/for-developers/sending-email/sender-identity), [Authenticate a single sender](https://www.twilio.com/docs/sendgrid/ui/sending-email/sender-verification), and [Build and Test Your Application: sender authentication](https://www.twilio.com/docs/sendgrid/onboarding/email-api/build-and-test-your-application).
