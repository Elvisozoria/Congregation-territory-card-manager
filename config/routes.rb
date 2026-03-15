Rails.application.routes.draw do
  root 'territories#index'
  resources :territories do
    resources :landmarks, only: [:create, :update, :destroy]
    member do
      get :card
    end
  end
  get 'print', to: 'territories#print'
end
