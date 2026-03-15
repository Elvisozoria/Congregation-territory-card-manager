require 'rails_helper'

RSpec.describe Territory, type: :model do
  describe 'validations' do
    it 'is valid with number and name' do
      territory = build(:territory)
      expect(territory).to be_valid
    end

    it 'is invalid without number' do
      territory = build(:territory, number: nil)
      expect(territory).not_to be_valid
      expect(territory.errors[:number]).to include("can't be blank")
    end

    it 'is invalid without name' do
      territory = build(:territory, name: nil)
      expect(territory).not_to be_valid
      expect(territory.errors[:name]).to include("can't be blank")
    end
  end

  describe 'associations' do
    it 'has many landmarks' do
      territory = create(:territory)
      landmark = create(:landmark, territory: territory)
      expect(territory.landmarks).to include(landmark)
    end

    it 'destroys landmarks when destroyed' do
      territory = create(:territory)
      create(:landmark, territory: territory)
      expect { territory.destroy }.to change(Landmark, :count).by(-1)
    end
  end

  describe '#center' do
    context 'with a valid polygon' do
      it 'returns the average lat/lng' do
        # polygon coords are [lng, lat] pairs
        territory = build(:territory, polygon: [[-70.0, 18.0], [-70.2, 18.2], [-70.4, 18.4]])
        center = territory.center
        expect(center[:lat]).to be_within(0.001).of(18.2)
        expect(center[:lng]).to be_within(0.001).of(-70.2)
      end
    end

    context 'with an empty polygon' do
      it 'returns nil' do
        territory = build(:territory, polygon: [])
        expect(territory.center).to be_nil
      end
    end

    context 'with a nil polygon' do
      it 'returns nil' do
        territory = build(:territory, polygon: nil)
        expect(territory.center).to be_nil
      end
    end
  end

  describe '#google_maps_url' do
    context 'with a valid polygon' do
      it 'returns a google maps URL' do
        territory = build(:territory, polygon: [[-70.0, 18.0], [-70.2, 18.2]])
        url = territory.google_maps_url
        expect(url).to include('https://www.google.com/maps/@')
        expect(url).to include('17z')
        expect(url).to include('18.1')
        expect(url).to include('-70.1')
      end
    end

    context 'with an empty polygon' do
      it 'returns nil' do
        territory = build(:territory, polygon: [])
        expect(territory.google_maps_url).to be_nil
      end
    end
  end
end
