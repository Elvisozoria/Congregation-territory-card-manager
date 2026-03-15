FactoryBot.define do
  factory :territory do
    sequence(:number) { |n| n.to_s }
    name { "Territory #{number}" }
    group_name { 'Group A' }
    polygon { [[-70.0, 18.0], [-70.1, 18.1], [-70.0, 18.1]] }
    qr_url { nil }
  end
end
