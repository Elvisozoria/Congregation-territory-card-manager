class TerritoriesController < ApplicationController
  before_action :set_territory, only: [:show, :edit, :update, :destroy, :card]

  def index
    @territories = Territory.all.order(:number)
  end

  def show
  end

  def new
    @territory = Territory.new
  end

  def create
    @territory = Territory.new(territory_params)
    if @territory.save
      redirect_to @territory
    else
      render :new, status: :unprocessable_entity
    end
  end

  def edit
  end

  def update
    if @territory.update(territory_params)
      redirect_to @territory
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @territory.destroy
    redirect_to territories_path, notice: 'Territory was successfully deleted.'
  end

  def card
    render layout: 'print'
  end

  def print
    @territories = Territory.all.order(:number)
    render layout: 'print'
  end

  private

  def set_territory
    @territory = Territory.find(params[:id])
  end

  def territory_params
    params.require(:territory).permit(:number, :name, :group_name, :qr_url, :polygon).tap do |p|
      p[:polygon] = JSON.parse(p[:polygon]) if p[:polygon].is_a?(String) && p[:polygon].present?
    end
  end
end
