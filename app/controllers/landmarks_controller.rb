class LandmarksController < ApplicationController
  before_action :set_territory

  def create
    @landmark = @territory.landmarks.build(landmark_params)
    if @landmark.save
      redirect_to @territory
    else
      redirect_to @territory, alert: 'Failed to create landmark.'
    end
  end

  def update
    @landmark = @territory.landmarks.find(params[:id])
    if @landmark.update(landmark_params)
      redirect_to @territory
    else
      redirect_to @territory, alert: 'Failed to update landmark.'
    end
  end

  def destroy
    @landmark = @territory.landmarks.find(params[:id])
    @landmark.destroy
    redirect_to @territory, notice: 'Landmark was successfully deleted.'
  end

  private

  def set_territory
    @territory = Territory.find(params[:territory_id])
  end

  def landmark_params
    params.require(:landmark).permit(:name, :lat, :lng, :color)
  end
end
