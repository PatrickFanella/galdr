package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/onnwee/pulse-score/internal/repository"
)

type stripeAppAccountManager interface {
	EnsureMarketplaceAccount(ctx context.Context, email, orgName string) (*MarketplaceAccountResponse, error)
}

type stripeAppOAuthConnector interface {
	ConnectURL(orgID uuid.UUID) (string, error)
	DisconnectByStripeAccount(ctx context.Context, stripeAccountID string) error
}

type stripeAppConnectionLookup interface {
	GetByProviderAndExternalID(ctx context.Context, provider, externalAccountID string) (*repository.IntegrationConnection, error)
}

// StripeAppInstallRequest contains install parameters received from the Stripe App Marketplace.
type StripeAppInstallRequest struct {
	Email           string `json:"email"`
	StripeAccountID string `json:"stripe_account_id"`
	AccountName     string `json:"account_name"`
	ReturnURL       string `json:"return_url"`
}

// StripeAppInstallResponse tells the client where to continue OAuth and onboarding.
type StripeAppInstallResponse struct {
	OAuthURL        string                      `json:"oauth_url"`
	RedirectURL     string                      `json:"redirect_url"`
	OrgID           uuid.UUID                   `json:"org_id"`
	StripeAccountID string                      `json:"stripe_account_id,omitempty"`
	CreatedAccount  bool                        `json:"created_account"`
	Auth            *MarketplaceAccountResponse `json:"auth,omitempty"`
}

// StripeAppInstallService coordinates marketplace install and uninstall flows.
type StripeAppInstallService struct {
	accounts    stripeAppAccountManager
	oauth       stripeAppOAuthConnector
	connections stripeAppConnectionLookup
}

func NewStripeAppInstallService(accounts stripeAppAccountManager, oauth stripeAppOAuthConnector, connections stripeAppConnectionLookup) *StripeAppInstallService {
	return &StripeAppInstallService{accounts: accounts, oauth: oauth, connections: connections}
}

// Install resolves or creates a PulseScore account, then returns the Stripe OAuth URL.
func (s *StripeAppInstallService) Install(ctx context.Context, req StripeAppInstallRequest) (*StripeAppInstallResponse, error) {
	if s == nil || s.oauth == nil {
		return nil, &ValidationError{Field: "stripe", Message: "Stripe app install is not configured"}
	}
	req.Email = strings.TrimSpace(req.Email)
	req.StripeAccountID = strings.TrimSpace(req.StripeAccountID)
	req.AccountName = strings.TrimSpace(req.AccountName)

	var orgID uuid.UUID
	if req.StripeAccountID != "" && s.connections != nil {
		conn, err := s.connections.GetByProviderAndExternalID(ctx, "stripe", req.StripeAccountID)
		if err != nil {
			return nil, fmt.Errorf("lookup stripe account connection: %w", err)
		}
		if conn != nil {
			orgID = conn.OrgID
		}
	}

	var account *MarketplaceAccountResponse
	if orgID == uuid.Nil {
		if req.Email == "" {
			return nil, &ValidationError{Field: "email", Message: "email is required for new Stripe app installs"}
		}
		if s.accounts == nil {
			return nil, &ValidationError{Field: "account", Message: "account creation is not configured"}
		}
		resolved, err := s.accounts.EnsureMarketplaceAccount(ctx, req.Email, req.AccountName)
		if err != nil {
			return nil, err
		}
		account = resolved
		orgID = resolved.Organization.ID
	}

	oauthURL, err := s.oauth.ConnectURL(orgID)
	if err != nil {
		return nil, err
	}
	return &StripeAppInstallResponse{
		OAuthURL:        oauthURL,
		RedirectURL:     oauthURL,
		OrgID:           orgID,
		StripeAccountID: req.StripeAccountID,
		CreatedAccount:  account != nil && account.Created,
		Auth:            account,
	}, nil
}

// HandleAppInstalled accepts Stripe's app.installed event. OAuth completion creates the actual connection.
func (s *StripeAppInstallService) HandleAppInstalled(ctx context.Context, stripeAccountID string) error {
	stripeAccountID = strings.TrimSpace(stripeAccountID)
	if stripeAccountID == "" {
		return &ValidationError{Field: "stripe_account_id", Message: "stripe account id is required"}
	}
	return nil
}

// HandleAppUninstalled disconnects the Stripe integration for the uninstalled Stripe account.
func (s *StripeAppInstallService) HandleAppUninstalled(ctx context.Context, stripeAccountID string) error {
	if s == nil || s.oauth == nil {
		return &ValidationError{Field: "stripe", Message: "Stripe app uninstall is not configured"}
	}
	return s.oauth.DisconnectByStripeAccount(ctx, stripeAccountID)
}
