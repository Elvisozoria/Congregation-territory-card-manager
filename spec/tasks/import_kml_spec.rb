require 'rails_helper'
require 'rake'

RSpec.describe 'territories:import_kml', type: :task do
  let(:fixture_kml) { Rails.root.join('spec/fixtures/test_territories.kml').to_s }

  before do
    Rails.application.load_tasks if Rake::Task.tasks.empty?
  end

  after do
    Rake::Task['territories:import_kml'].reenable
  end

  it 'imports territories from a KML file' do
    expect {
      Rake::Task['territories:import_kml'].invoke(fixture_kml)
    }.to change(Territory, :count).by(3)
  end

  it 'sets the correct territory number' do
    Rake::Task['territories:import_kml'].invoke(fixture_kml)
    expect(Territory.find_by(number: '1').name).to eq('prados')
  end

  it 'strips parenthetical notes from name' do
    Rake::Task['territories:import_kml'].invoke(fixture_kml)
    expect(Territory.find_by(number: '2').name).to eq('la mina')
  end

  it 'sets the group_name from the folder' do
    Rake::Task['territories:import_kml'].invoke(fixture_kml)
    expect(Territory.find_by(number: '1').group_name).to eq('Oeste')
    expect(Territory.find_by(number: '3').group_name).to eq('Este')
  end

  it 'stores polygon as array of [lng, lat] pairs' do
    Rake::Task['territories:import_kml'].invoke(fixture_kml)
    t = Territory.find_by(number: '1')
    expect(t.polygon).to be_an(Array)
    expect(t.polygon.first).to eq([-70.0, 18.0])
  end
end
