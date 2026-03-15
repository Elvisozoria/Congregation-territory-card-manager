require 'nokogiri'
require 'zip'

namespace :territories do
  desc 'Import territories from a KML or KMZ file. Usage: rails territories:import_kml[/path/to/file.kml]'
  task :import_kml, [:path] => :environment do |_t, args|
    path = args[:path]
    abort 'Usage: rails territories:import_kml[/path/to/file.kml]' if path.blank?
    abort "File not found: #{path}" unless File.exist?(path)

    kml_content = if path.end_with?('.kmz')
                    extract_kml_from_kmz(path)
                  else
                    File.read(path)
                  end

    doc = Nokogiri::XML(kml_content)
    doc.remove_namespaces!

    imported = 0
    skipped = 0

    doc.xpath('//Folder').each do |folder|
      group_name = folder.at_xpath('name')&.text&.strip

      folder.xpath('Placemark').each do |placemark|
        raw_name = placemark.at_xpath('name')&.text&.strip
        next if raw_name.blank?

        # Extract number and name: "1 prados" or "10 la mina (dividir)"
        # If name part is empty (e.g. "9" or "3 "), use the number as the name
        tokens = raw_name.split(' ', 2)
        number = tokens[0]
        full_name = tokens[1].to_s.gsub(/\s*\([^)]*\)\s*/, '').strip
        full_name = number if full_name.blank?

        coords_text = placemark.at_xpath('.//coordinates')&.text&.strip
        next if coords_text.blank?

        polygon = coords_text.split(/\s+/).filter_map do |triplet|
          parts = triplet.split(',')
          next if parts.length < 2

          lng = parts[0].to_f
          lat = parts[1].to_f
          [lng, lat]
        end

        territory = Territory.find_or_initialize_by(number: number)
        territory.assign_attributes(
          name: full_name,
          group_name: group_name,
          polygon: polygon
        )

        if territory.save
          imported += 1
          puts "  Imported: #{number} #{full_name} (#{polygon.length} coords)"
        else
          skipped += 1
          puts "  Skipped: #{number} #{full_name} — #{territory.errors.full_messages.join(', ')}"
        end
      end
    end

    puts "\nDone. Imported: #{imported}, Skipped: #{skipped}"
  end

  def extract_kml_from_kmz(kmz_path)
    require 'zip'
    kml_content = nil
    Zip::File.open(kmz_path) do |zip|
      entry = zip.find { |e| e.name.end_with?('.kml') }
      abort 'No .kml file found inside KMZ archive' unless entry

      kml_content = entry.get_input_stream.read
    end
    kml_content
  end
end
