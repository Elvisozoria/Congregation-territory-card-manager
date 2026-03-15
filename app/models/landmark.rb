class Landmark < ApplicationRecord
  belongs_to :territory

  validates :name, :lat, :lng, presence: true
end
