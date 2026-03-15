FactoryBot.define do
  factory :landmark do
    sequence(:name) { |n| "Landmark #{n}" }
    lat { 18.0 }
    lng { -70.0 }
    color { '#3B82F6' }
    association :territory
  end
end
