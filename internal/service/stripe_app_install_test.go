package service

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/onnwee/pulse-score/internal/auth"
	"github.com/onnwee/pulse-score/internal/repository"
)

func TestStripeAppInstallCreatesAccountAndReturnsOAuthURL(t *testing.T) {
	orgID := uuid.New()
	accounts := &fakeStripeAppAccounts{
		response: &MarketplaceAccountResponse{
			AuthResponse: AuthResponse{
				User:         AuthUser{ID: uuid.New(), Email: "new@example.com"},
				Organization: AuthOrg{ID: orgID, Name: "New Co", Role: "owner"},
				Tokens:       &auth.TokenPair{AccessToken: "access", RefreshToken: "refresh"},
			},
			Created: true,
		},
	}
	oauth := &fakeStripeAppOAuth{}
	service := NewStripeAppInstallService(accounts, oauth, &fakeStripeAppConnections{})

	resp, err := service.Install(context.Background(), StripeAppInstallRequest{
		Email:           "new@example.com",
		StripeAccountID: "acct_new",
		AccountName:     "New Co",
	})
	if err != nil {
		t.Fatalf("Install returned error: %v", err)
	}
	if !resp.CreatedAccount || resp.Auth == nil {
		t.Fatalf("expected created account auth response, got %#v", resp)
	}
	if accounts.gotEmail != "new@example.com" || accounts.gotOrgName != "New Co" {
		t.Fatalf("expected account creation inputs, got email=%q org=%q", accounts.gotEmail, accounts.gotOrgName)
	}
	if oauth.gotOrgID != orgID || resp.OAuthURL != "https://stripe.test/oauth?org="+orgID.String() {
		t.Fatalf("expected OAuth URL for org %s, got %#v", orgID, resp)
	}
}

func TestStripeAppInstallUsesExistingStripeAccountConnection(t *testing.T) {
	orgID := uuid.New()
	accounts := &fakeStripeAppAccounts{}
	oauth := &fakeStripeAppOAuth{}
	connections := &fakeStripeAppConnections{
		connection: &repository.IntegrationConnection{OrgID: orgID, Provider: "stripe", ExternalAccountID: "acct_existing"},
	}
	service := NewStripeAppInstallService(accounts, oauth, connections)

	resp, err := service.Install(context.Background(), StripeAppInstallRequest{StripeAccountID: "acct_existing"})
	if err != nil {
		t.Fatalf("Install returned error: %v", err)
	}
	if accounts.called {
		t.Fatal("did not expect account creation for existing Stripe account connection")
	}
	if connections.gotProvider != "stripe" || connections.gotExternalID != "acct_existing" {
		t.Fatalf("expected stripe account lookup, got provider=%q external=%q", connections.gotProvider, connections.gotExternalID)
	}
	if resp.OrgID != orgID || resp.CreatedAccount {
		t.Fatalf("expected existing org response, got %#v", resp)
	}
	if oauth.gotOrgID != orgID {
		t.Fatalf("expected OAuth URL for existing org, got %s", oauth.gotOrgID)
	}
}

func TestStripeAppInstallRequiresEmailWhenNoExistingConnection(t *testing.T) {
	service := NewStripeAppInstallService(&fakeStripeAppAccounts{}, &fakeStripeAppOAuth{}, &fakeStripeAppConnections{})

	_, err := service.Install(context.Background(), StripeAppInstallRequest{StripeAccountID: "acct_missing"})
	if err == nil {
		t.Fatal("expected validation error")
	}
	validation, ok := err.(*ValidationError)
	if !ok || validation.Field != "email" {
		t.Fatalf("expected email validation error, got %T %v", err, err)
	}
}

func TestStripeAppUninstallDisconnectsByStripeAccount(t *testing.T) {
	oauth := &fakeStripeAppOAuth{}
	service := NewStripeAppInstallService(nil, oauth, nil)

	if err := service.HandleAppUninstalled(context.Background(), "acct_uninstall"); err != nil {
		t.Fatalf("HandleAppUninstalled returned error: %v", err)
	}
	if oauth.disconnectedAccountID != "acct_uninstall" {
		t.Fatalf("expected uninstall disconnect, got %q", oauth.disconnectedAccountID)
	}
}

type fakeStripeAppAccounts struct {
	response   *MarketplaceAccountResponse
	called     bool
	gotEmail   string
	gotOrgName string
}

func (f *fakeStripeAppAccounts) EnsureMarketplaceAccount(_ context.Context, email, orgName string) (*MarketplaceAccountResponse, error) {
	f.called = true
	f.gotEmail = email
	f.gotOrgName = orgName
	return f.response, nil
}

type fakeStripeAppOAuth struct {
	gotOrgID              uuid.UUID
	disconnectedAccountID string
}

func (f *fakeStripeAppOAuth) ConnectURL(orgID uuid.UUID) (string, error) {
	f.gotOrgID = orgID
	return "https://stripe.test/oauth?org=" + orgID.String(), nil
}

func (f *fakeStripeAppOAuth) DisconnectByStripeAccount(_ context.Context, stripeAccountID string) error {
	f.disconnectedAccountID = stripeAccountID
	return nil
}

type fakeStripeAppConnections struct {
	connection    *repository.IntegrationConnection
	gotProvider   string
	gotExternalID string
}

func (f *fakeStripeAppConnections) GetByProviderAndExternalID(_ context.Context, provider, externalAccountID string) (*repository.IntegrationConnection, error) {
	f.gotProvider = provider
	f.gotExternalID = externalAccountID
	return f.connection, nil
}
