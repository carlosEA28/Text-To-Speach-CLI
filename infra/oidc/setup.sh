#!/usr/bin/env bash
set -euo pipefail

ACCOUNT_ID="235494777438"
REPO="carlosEA28/Text-To-Speach-CLI"
ROLE_NAME="github-actions-deploy"
OIDC_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> 1/4 Provider OIDC"
THUMBPRINT="6938fd4d98bab03faadb97b34396831e3780aea1"
if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_ARN" >/dev/null 2>&1; then
  CURRENT="$(aws iam get-open-id-connect-provider --open-id-connect-provider-arn "$OIDC_ARN" --query 'ThumbprintList' --output text)"
  if [[ "$CURRENT" != *"$THUMBPRINT"* ]]; then
    aws iam update-open-id-connect-provider-thumbprint \
      --open-id-connect-provider-arn "$OIDC_ARN" \
      --thumbprint-list "$THUMBPRINT"
    echo "    Thumbprint atualizado para o certificado atual do GitHub."
  else
    echo "    Já existe e com thumbprint atual."
  fi
else
  aws iam create-open-id-connect-provider \
    --url https://token.actions.githubusercontent.com \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list "$THUMBPRINT"
  echo "    Criado."
fi

echo "==> 2/4 Trust policy (repo ${REPO}, branch main)"
TRUST_POLICY="$DIR/trust-policy.json"
cat > "$TRUST_POLICY" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "${OIDC_ARN}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:${REPO}:ref:refs/heads/main"
        }
      }
    }
  ]
}
EOF
echo "    Gerado em ${TRUST_POLICY}"

echo "==> 3/4 Role ${ROLE_NAME}"
if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  echo "    Já existe."
else
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "file://${TRUST_POLICY}" \
    >/dev/null
  echo "    Criada."
fi

echo "==> 4/4 Policy de permissões (inline: terraform)"
aws iam put-role-policy \
  --role-name "$ROLE_NAME" \
  --policy-name terraform \
  --policy-document "file://${DIR}/deploy-policy.json"
echo "    Anexada."

ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"
echo ""
echo "======================================================"
echo "Cole este ARN no secret AWS_ROLE_TO_ASSUME do GitHub:"
echo "  ${ROLE_ARN}"
echo "======================================================"