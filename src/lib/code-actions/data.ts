export const languagesOpts = {
    '.js': {
        opt_1: {
            dep: 'npm install dotenv',
            imp: '',
            init: "\nIDT_TMPrequire('dotenv').config(); // NEW LINE ADDED\n\n",
            use: 'process.env.SECRET_TMP',
            tag: '',
        },
    },
    '.java': {
        opt_1: {
            dep: '\t<!-- NEW DEPENDENCY ADDED! -->\n\t\t<dependency>\n\t\t\t<groupId>io.github.cdimascio</groupId>\n\t\t\t<artifactId>dotenv-java</artifactId>\n\t\t\t<version>2.2.0</version>\n\t\t</dependency>\n\t</dependencies>',
            imp: 'import io.github.cdimascio.dotenv.Dotenv; // NEW LINE ADDED\n',
            init: '\nIDT_TMPDotenv dotenv = Dotenv.configure().load(); // NEW LINE ADDED \n\n',
            use: 'dotenv.get("SECRET_TMP")',
            tag: 'package',
        },
        opt_2: {
            dep: '',
            imp: 'import java.io.BufferedReader; // NEW LINE ADDED\nimport java.io.FileReader; // NEW LINE ADDED\nimport java.io.IOException; // NEW LINE ADDED\n\n',
            init: '\n// NEW FUNCTION ADDED! To read the .env file without a dependency. \n// Please check if you need this function static or not\n\tpublic static String getSecret(String secretName) {\n\t\ttry {\n\t\t\tBufferedReader reader = new BufferedReader(new FileReader(".env"));\n\t\t\tString line, secret = "";\n\t\t\twhile ((line = reader.readLine()) != null) {\n\t\t\t\tString[] parts = line.split("=");\n\t\t\t\tif (parts.length == 2 && parts[0].trim().equals(secretName)) {\n\t\t\t\t\tsecret = parts[1].trim();\n\t\t\t\t\tbreak;\n\t\t\t\t}\n\t\t\t}\n\t\t\treader.close();\n\t\t\treturn secret;\n\t\t} catch (IOException e) {\n\t\t\te.printStackTrace();\n\t\t\treturn "";\n\t\t}\n\t}\n',
            use: 'getSecret("SECRET_TMP")',
            tag: '',
        },
    },
    '.py': {
        opt_1: {
            dep: 'pip install python-dotenv',
            imp: 'from dotenv import load_dotenv # NEW LINE ADDED\nimport os # NEW LINE ADDED\n',
            init: '\nIDT_TMPload_dotenv() # NEW LINE ADDED\n\n',
            use: 'os.getenv("SECRET_TMP")',
            tag: '',
        },
    },
    '.cs': {
        opt_1: {
            dep: 'dotnet add package DotNetEnv',
            imp: '',
            init: '\nIDT_TMPDotNetEnv.Env.TraversePath().Load(); // NEW LINE ADDED\n\n',
            use: 'Environment.GetEnvironmentVariable("SECRET_TMP")',
            tag: '',
        },
    },
    '.php': {
        opt_1: {
            dep: 'composer require vlucas/phpdotenv',
            imp: "IDT_TMPrequire_once __DIR__ . '/vendor/autoload.php'; // NEW LINE ADDED\n",
            init: '\nIDT_TMP$dotenv = Dotenv\\Dotenv::createImmutable(__DIR__); // NEW LINE ADDED\nIDT_TMP$dotenv->load(); // NEW LINE ADDED\n\n',
            use: '$_ENV["SECRET_TMP"]',
            tag: '<?php',
        },
    },
};

export const btpPrompt =
    "Please provide only a simple code snippet, without introduction, in EXTENSION_TMP to access to this environement variables:: {'VCAP_SERVICES':{'credstore': [{...'credentials': {'password': '','encryption': {'client_private_key': '',...},...,'url': '','username': ''}}]}} Make a short answer.";

export const otherPrompt =
    'Please provide the code snippets required to access a secret stored VALUE_TMP for a EXTENSION_TMP application. Give first the official doc of VALUE_TMP, then how to store the secret with a step by steg guide with a lot of details and finally the code snippet to retrieve the secret in the EXTENSION_TMP code. Give your answer in a way to be displayed inside a HTML page between the <body> </body> tag already present. Structure the answer with delimited areas and titles. Please include a sentence to inform that it is a generated code and documentation by an AI so he has to be verified. The answerwill be diplay as it so no intriduction sentence.';

export const btpDocumentation =
    "<h2>BTP Credential Store Step-by-Step Guide:</h2><ol><li><strong>Entitlement Assignment</strong><ul><li>Your application need to be deployed on BTP</li><li>From your global account page, select '<em>Entitlements</em>' -> '<em>Entity Assignments</em>' from the left menu, and choose the target subaccount.</li><li>Select '<em>Edit</em>' -> '<em>Add Service Plans</em>'. Search for '<em>Credential Store</em>' and choose a plan based on these guidelines:<ul><li>For a Consumption-Based Model, we recommend starting with the 'Free' plan.</li><li>If you're on a Subscription-Based Model, only the 'Standard' plan is available (which isn't free).</li><li>For Trial Accounts, opt for the 'Trial' plan.</li></ul></li><li>By default, the authentication type is <a href='https://help.sap.com/docs/credential-store/sap-credential-store/mutual-tls-authentication'>MTLS</a>. You can change for a <a href='https://help.sap.com/docs/credential-store/sap-credential-store/basic-authentication'>Basic Authentication</a> by providing this parameter: <em>{ 'authentication': { 'type': 'basic' } } </em></li></ul> </li><li><strong>Service Binding</strong><ul><li>From your application page, select '<em>Service Bindings</em>' from the left menu, and create a new one for 'Credential Store'.</li></ul></li></ol><p><strong>Note:</strong> If you're on a Consumption-Based Model and want to upgrade from 'Free' to 'Standard':<ul><li>In Cloud Foundry, simply adjust the service settings.</li><li>In Kyma, you'll need to recreate the service instance.</li></ul></p><p>For more information, visit the following links:</p><ul><li>SAP Discovery Center: <a href='https://discovery-center.cloud.sap/serviceCatalog/credential-store?region=all'>Credential Store</a>.</li><li>SAP Help Portal: <a href='https://help.sap.com/docs/credential-store'>SAP Credential Store</a>.</li><li>SAP Community, Technology Blogs: <a href='https://community.sap.com/t5/technology-blogs-by-sap/sap-btp-safely-consume-your-app-secrets-with-credential-store-%EF%B8%8F/ba-p/13534019'>SAP BTP - Safely consume your app secrets with Credential Store 🕵️</a>.</li></ul><p>The 'VCAP_SERVICES' environment variable stores essential REST API endpoint information for the SAP credential store, alongside the associated credentials required to access the API. Additionally, it includes details of the 'client_private_key,' utilized for decrypting the response payload. The structure of this variable may vary slightly depending on the chosen authentication method. Here an example of VCAP_SERVICES with the Basic Auth type and all the information you will need to retrieve and decrypt the payload: </p><pre> <code>{<br/>&emsp;'VCAP_SERVICES':<br/>&emsp;&emsp;{<br/>&emsp;&emsp;&emsp;'credstore': <br/>&emsp;&emsp;&emsp;&emsp;[<br/>&emsp;&emsp;&emsp;&emsp;&emsp;{<br/>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;'...,'<br/>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;'credentials': <br/>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;{<br/>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;'password': '',<br/>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;'encryption': <br/>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;{<br/>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;'client_private_key': '',<br/>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;'...'<br/>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;},<br/>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;'...',<br/>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;'url': '',<br/>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;'username': ''<br/>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;},<br/>&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;&emsp;'...'<br/>&emsp;&emsp;&emsp;&emsp;&emsp;}<br/>&emsp;&emsp;&emsp;&emsp;]<br/>&emsp;&emsp;}<br/>}</code> </pre><p><strong>And here is some code (generated by an AI) on how to access 'VCAP_SERVICES', based on your file extension:</strong></p><pre><code>CODE_TMP</code></pre><p> The HTTP header should include a custom namespace header labeled 'sapcp-credstore-namespace'. </p><p> The payload encryption is based on JWE compact serialization format. Check JSON Web Encryption.<ul>Supported algorithms:<ul><li>Key encryption: RSA-OAEP-256</li><li>Content encryption: A256GCM </li></ul></ul>You will need the private key to decrypt it.</p>";

export const beginHtml =
    "<!DOCTYPE html> <html lang='en'> <head> <meta charset='UTF-8'> <meta name='viewport' content='width=device-width, initial-scale=1.0'> <title>VALUE_TMP Step-by-Step Guide</title> <style> body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; /* Adjust line height */ } h2 { color: #007acc; } ol { margin-left: 20px; } </style> </head> <body>";

export const endHtml = '</body> </html>';

export const promptEnvVar =
    'I need to generate as short as possible instructions for storing in a .env file a hardcoded secret from a EXTENSION_TMP file. The full response will be directly copied pasted to the EXTENSION_TMP file, please make sure ALL your answer is in one unique comment section, to be sure to not generate error in the EXTENSION_TMP file. Add symbols to make sure the user see where your answer starts and ends, in one comment block section.';

export const openAIUrl = 'https://api.openai.com/v1/chat/completions';
