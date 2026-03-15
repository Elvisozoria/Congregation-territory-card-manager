class CreateLandmarks < ActiveRecord::Migration[7.0]
  def change
    create_table :landmarks do |t|
      t.string :name, null: false
      t.float :lat, null: false
      t.float :lng, null: false
      t.string :color, default: '#3B82F6'
      t.references :territory, null: false, foreign_key: true

      t.timestamps
    end
  end
end
