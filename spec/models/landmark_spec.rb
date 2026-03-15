require 'rails_helper'

RSpec.describe Landmark, type: :model do
  describe 'validations' do
    it 'is valid with all required attributes' do
      landmark = build(:landmark)
      expect(landmark).to be_valid
    end

    it 'is invalid without name' do
      landmark = build(:landmark, name: nil)
      expect(landmark).not_to be_valid
      expect(landmark.errors[:name]).to include("can't be blank")
    end

    it 'is invalid without lat' do
      landmark = build(:landmark, lat: nil)
      expect(landmark).not_to be_valid
      expect(landmark.errors[:lat]).to include("can't be blank")
    end

    it 'is invalid without lng' do
      landmark = build(:landmark, lng: nil)
      expect(landmark).not_to be_valid
      expect(landmark.errors[:lng]).to include("can't be blank")
    end
  end

  describe 'default color' do
    it 'defaults to #3B82F6' do
      territory = create(:territory)
      landmark = Landmark.create!(name: 'Test', lat: 18.0, lng: -70.0, territory: territory)
      expect(landmark.color).to eq('#3B82F6')
    end
  end

  describe 'associations' do
    it 'belongs to a territory' do
      territory = create(:territory)
      landmark = create(:landmark, territory: territory)
      expect(landmark.territory).to eq(territory)
    end
  end
end
