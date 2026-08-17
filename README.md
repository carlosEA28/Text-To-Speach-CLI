# Text-to-Speech Serverless (AWS Lambda + Polly + S3 + API Gateway)

Converte texto em áudio usando AWS, com **arquitetura serverless completa** e uma **CLI openTUI** para uso local.

## Arquitetura

```
            POST /tts (JSON: {text, voice})
                          │
                    API Gateway ──► Lambda ──► AWS Polly (síntese MP3)
                          ▲                 │
                          │                 ▼
              resposta {url}             S3 (salva o áudio)
```

- **API Gateway**: endpoint HTTP público (`POST /tts`), com CORS habilitado.
- **Lambda** (Node.js): valida o texto, chama o Polly, salva o MP3 no S3 e retorna a URL.
- **Polly**: gera o áudio (vozes neural/standard).
- **S3**: armazena os MP3 (`audio/*.mp3`), com leitura pública apenas nesse prefixo.

## Estrutura

```
├── cli/                   # CLI openTUI (uso local)
│   ├── cli.tsx            #   interface
│   ├── tts-core.mjs       #   síntese direta via Polly
│   └── aws-config.mjs     #   detecta perfil/região AWS (SSO)
├── lambda_function.mjs    # Handler da Lambda (Node)
├── tests/                 # Testes unitários (node:test + mocks)
├── tsconfig.json          # Config JSX (@opentui/react)
├── infra/                 # Infraestrutura Terraform
│   ├── main.tf            #   Provider + backend S3
│   ├── s3.tf              #   Bucket de áudio
│   ├── iam.tf             #   Role/policies da Lambda
│   ├── lambda.tf          #   Função Lambda
│   ├── api_gateway.tf     #   API + rota /tts + CORS
│   ├── variables.tf       #   region, project_name
│   └── outputs.tf         #   api_url, bucket_name
└── .github/workflows/ci.yml # CI/CD (test + terraform plan/apply)
```

## Requisitos

- Node **26+** (openTUI usa `node:ffi`). O `mise.toml` já fixa o Node 26 no projeto: `mise install`.
- AWS CLI com perfil configurado (ex.: SSO) — a CLI detecta automaticamente.
- Terraform **>= 1.5** para o deploy.

## 1. CLI local

```bash
mise install
npm install
npm start
```

- Digite o texto e pressione **Enter** → salva `output.mp3`.
- Se der erro de credenciais: `aws sso login --profile <seu-perfil>`.

## 2. Testes

```bash
npm test
```

Testes unitários com `node:test`, usando mocks do Polly/S3 (não chamam a AWS).

## 3. Deploy (Terraform)

### Bootstrap (uma vez)

Crie o bucket do estado do Terraform:

```bash
aws s3 mb s3://tts-terraform-state-235494777438 --region sa-east-1
aws s3api put-bucket-versioning --bucket tts-terraform-state-235494777438 \
  --versioning-configuration Status=Enabled
```

### Deploy

```bash
cd infra
terraform init        # já usa o backend S3
terraform plan        # veja o que será criado
terraform apply       # cria S3 + IAM + Lambda + API Gateway
```

Ao final, o output mostra a `api_url`.

### Testar o endpoint

```bash
curl -X POST https://<SUA-URL>.execute-api.sa-east-1.amazonaws.com/prod/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Olá, mundo!", "voice": "Camila"}'
```

A resposta contém a `url` do MP3 no S3.

> **Custo:** Polly US$ 16/1M chars (neural) · Lambda ~US$ 0,20/1M req · API GW ~US$ 3,50/1M req · S3 ~US$ 0,023/GB/mês. Testes pontuais custam frações de centavo.

## 4. CI/CD (GitHub Actions)

O workflow `.github/workflows/ci.yml`:

- **push/PR** → `npm test` + `terraform plan`.
- **push na `main`** → `terraform apply`.

### Setup do GitHub

1. Crie um **OIDC provider** do GitHub na AWS (IAM → Identity providers):

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

2. Crie uma **role** de deploy com trust policy para o seu repo, que a Lambda possa assumir
   (permissões de `terraform`/S3/API Gateway/Lambda/CloudWatch). Anote o ARN.
3. No GitHub, adicione o secret **`AWS_ROLE_TO_ASSUME`** com esse ARN.

> Alternativa sem OIDC: usar `secrets.AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`
> (troque o passo de credenciais no workflow).

## 5. Destroy (desmontar a infra)

O **estado do Terraform é salvo no S3** (`tts-terraform-state-235494777438`), então você pode destruir e recriar tudo em qualquer momento.

### Pelo CLI

```bash
cd infra
terraform destroy    # confirme com "yes"
```

### Pela CI (GitHub Actions)

No GitHub, aba **Actions → Destroy → Run workflow**, e digite `destroy` no input `confirm`.

> O workflow de destroy exige confirmação manual (`confirm: destroy`) para evitar cliques acidentais.
> O bucket de estado (`tts-terraform-state-235494777438`) NÃO é destruído — ele é o bootstrap manual e guarda o estado para recriar depois.

## Vozes

`Camila`, `Vitoria`, `Ricardo` (pt-BR) · `Joanna`, `Matthew`, `Salli` (en-US).
Para usar engine neural: `{"text": "...", "voice": "Camila", "engine": "neural"}`.