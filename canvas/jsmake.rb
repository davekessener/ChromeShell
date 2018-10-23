require 'fileutils'

class Makefile
	DEFAULT_MK = 'stub.js'
	OPERATIONS = [:include]

	def initialize
		@includes = []
		@stack = []
	end

	def include(fn)
		raise "ERR: invalid file #{fn}!" if not File.exists? fn
		raise "ERR: recursive includes: #{fn}!" if @stack.include? fn

		unless @includes.include? fn
			@stack.push fn

			Makefile.read_directives(fn).each do |d|
				process(d)
			end

			@stack.pop
			@includes.push fn
		end
	end

	def write(fn)
		File.open(fn, 'w') do |f|
			@includes.each do |inc|
				File.open(inc, 'r') do |fin|
					if (line = fin.readline).start_with? '/***'
						line = fin.readline until line.start_with? '***/'
						line = fin.readline
					end

					f.write(line + fin.read + "\n")
				end
			end
		end
	end

	def process(d)
		d = d.split(/[ \t]+/, 2)
		op, arg = d[0].to_sym, d[1].strip
		
		if OPERATIONS.include? op
			send op, arg
		else
			raise "ERR: unknown operation #{op}!"
		end
	end

	def self.read_directives(fn)
		d = []

		if is_valid? fn
			File.open(fn, 'r') do |f|
				f.readline

				until (line = f.readline).start_with? '***/'
					d.push line[1...-1] if line.start_with? '#'
				end
			end
		end

		d
	end

	def self.is_valid?(fn)
		File.exists? fn and File.open(fn, 'r') { |f| f.readline.start_with? '/***' }
	end

	def self.find
		(is_valid? DEFAULT_MK and DEFAULT_MK) or Dir.glob('*.js').find { |fn| is_valid? fn }
	end
end

if (fn = Makefile.find)
	if File.open(fn, 'r') { |f| f.readline } =~ /\/\*\*\*[ \t]*([a-zA-Z0-9_-]+)[ \t]*\n/
		target = $1
		mk = Makefile.new

		mk.include(fn)
		mk.write("#{target}.js")

		puts "[#{Time.new}]: Created #{target}.js"
	else
		puts "garbage"
	end
else
	puts "Could not find a valid js-make file"
end

