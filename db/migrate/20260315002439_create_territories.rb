class CreateTerritories < ActiveRecord::Migration[7.0]
  def change
    create_table :territories do |t|
      t.string :number, null: false
      t.string :name, null: false
      t.string :group_name
      t.jsonb :polygon, default: []
      t.string :qr_url

      t.timestamps
    end
  end
end
