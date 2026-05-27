package handler

import (
	"encoding/json"
	"net/http"

	"github.com/onnwee/pulse-score/internal/service"
)

// StripeAppHandler provides public Stripe App Marketplace install endpoints.
type StripeAppHandler struct {
	installSvc *service.StripeAppInstallService
}

func NewStripeAppHandler(installSvc *service.StripeAppInstallService) *StripeAppHandler {
	return &StripeAppHandler{installSvc: installSvc}
}

// Install handles Stripe Marketplace install redirects.
func (h *StripeAppHandler) Install(w http.ResponseWriter, r *http.Request) {
	req := service.StripeAppInstallRequest{
		Email:           r.URL.Query().Get("email"),
		StripeAccountID: firstQueryValue(r, "stripe_account_id", "account_id", "stripe_user_id"),
		AccountName:     firstQueryValue(r, "account_name", "business_name"),
		ReturnURL:       r.URL.Query().Get("return_url"),
	}
	if r.Method == http.MethodPost {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, errorResponse("invalid request body"))
			return
		}
	}
	resp, err := h.installSvc.Install(r.Context(), req)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, resp)
}

func firstQueryValue(r *http.Request, keys ...string) string {
	for _, key := range keys {
		if value := r.URL.Query().Get(key); value != "" {
			return value
		}
	}
	return ""
}
