class Territory < ApplicationRecord
  has_many :landmarks, dependent: :destroy

  validates :number, :name, presence: true

  def center
    return nil if polygon.blank?

    lngs = polygon.map { |coord| coord[0] }
    lats = polygon.map { |coord| coord[1] }
    {
      lat: lats.sum / lats.length.to_f,
      lng: lngs.sum / lngs.length.to_f
    }
  end

  def google_maps_url
    c = center
    return nil if c.nil?

    "https://www.google.com/maps/@#{c[:lat]},#{c[:lng]},17z"
  end
end
