class Array
	def prepend(*a)
		a.reverse.each { |e| self.unshift(e) }
	end
end

module Splitter
	INIT = -1
	ID = 0
	STR = 1
	ESC = 2
	WS = 3
	SYM = 4
	NUM = 5

	def self.split(line)
		p = []
		s = INIT
		b = ''

		push = ->( ) {
			p.push b unless b.empty?
			b = ''
		}

		is_str = ->(c) { c == '"' or c == "'" }
		is_ws = ->(c) { c == "\t" or c == ' ' }
		is_ids = ->(c) {
			 (c >= 'a' and c <= 'z') or (c >= 'A' and c <= 'Z') or c == '$' or c == '_'
		}
		is_num = ->(c) { c >= '0' and c <= '9' }
		is_id = ->(c) {
			is_ids.(c) or is_num.(c)
		}

		line.chars do |c|
			if c == "\n"
				push.()
			else
				case s
					when INIT
						b += c

						if is_ws.(c)
							s = WS
						elsif is_str.(c)
							s = STR
						elsif is_ids.(c)
							s = ID
						elsif is_num.(c)
							s = NUM
						else
							s = SYM
						end

					when ID
						if is_ws.(c)
							s = WS
						elsif is_str.(c)
							s = STR
						elsif is_id.(c)
							s = ID
						elsif is_num.(c)
							s = NUM
						else
							s = SYM
						end

						push.() unless s == ID

						b += c

					when STR
						b += c

						if is_str.(c)
							push.()
							s = INIT
						elsif c == '\\'
							s = ESC
						end

					when ESC
						b += c
						s = STR

					when WS
						if is_ws.(c)
							s = WS
						elsif is_str.(c)
							s = STR
						elsif is_ids.(c)
							s = ID
						elsif is_num.(c)
							s = NUM
						else
							s = SYM
						end

						push.() unless s == WS

						b += c

					when SYM
						push.()

						if is_ws.(c)
							s = WS
						elsif is_str.(c)
							s = STR
						elsif is_ids.(c)
							s = ID
						elsif is_num.(c)
							s = NUM
						else
							s = SYM
						end

						b += c

					when NUM
						if is_ws.(c)
							s = WS
						elsif is_str.(c)
							s = STR
						elsif is_ids.(c)
							s = ID
						elsif is_num.(c)
							s = NUM
						else
							s = SYM
						end

						push.() unless s == NUM

						b += c
				end
			end
		end

		push.()

		p
	end
end

class Preprocessor
	ACTIONS = {
		:module => :doNothing,
		:include => :doInclude,
		:define => :doDefine
	}

	RECURSION_MAX = 1000

	def initialize(m, comp = false)
		@content = []
		@includes = []
		@macros = {}
		@comp = comp

		@content.push("// JS Module #{m}\n\n") unless @comp
	end

	def doNothing(a)
	end

	def doInclude(fn)
		fn.strip!
		fn = fn[1...-1] if fn[0] == '"' and fn[fn.length - 1] == '"'

		return if @includes.include? fn

		@content.push("\n// BEGIN #{fn}\n\n") unless @comp

		@includes.push(fn)

		cl = 0

		line = ''
		File.readlines(fn).each do |l|
			@macros['__FILE__'] = "\"#{fn}\""
			@macros['__LINE__'] = "#{cl}"
			cl += 1

			line += l

			if l.end_with? "\\\n"
				line[-2..-1] = ' '
			else
				processLine(line)
				line = ''
			end
		end

		unless line.empty?
			raise "ERR: trailing characters: #{line}"
		end

		@content.push("\n// END #{fn}\n\n") unless @comp
	end

	def doDefine(n)
		@@MACRO_R ||= (->() {
			ws = /[ \t]*/
			id = /[a-zA-Z_][a-zA-Z0-9_]*/
			/^(#{id})\((#{ws}(#{id}(#{ws},#{ws}#{id})*)?)#{ws}\)[ \t]#{ws}(.*)$/
		}).()

		if n =~ @@MACRO_R
			id, args, body = $1, $2.split(',').map { |a| a.strip }, $5.gsub(/,[ \t]*__VA_ARGS__/, ' __VA_ARGS__')

			@macros[id] = {
				arguments: args,
				body: body
			}
		else
			name, value = *n.split(/[ \t]+/, 2)

			@macros[name] = value
		end
	end

	def processLine(line)
		if line.start_with? '//#'
			pr = line[3...-1].split(/[ \t]+/, 2)
			instruction, rest = pr[0].downcase.to_sym, pr[1]

			if (a = ACTIONS[instruction])
				send a, rest
			else
				raise "ERR: Unknown instruction #{instruction}!"
			end
		else
			line = Preprocessor.uncomment(line) if @comp

			done = []
			open = []

			partition = ->(v, n) {
				open.prepend(*Splitter.split(v).map { |e| [e, n] })
			}

			resolve = ->(v, n) {
				if n >= RECURSION_MAX
					raise "ERR: Max recursion depth exceeded! (#{v})"
				elsif (m = @macros[v])
					if m.is_a? String
						partition.(m, n + 1)
					else
						if (t = open[0]) and t[0] == '('
							a = ['']
							
							open.shift

							c = 1
							while c > 0
								raise "Unexpected EOL" if open.empty?

								t = open.shift[0]

								if t == ')'
									a.last << t if c > 1
									c -= 1
								elsif t == '('
									a.last << t
									c += 1
								elsif c == 1 and t == ','
									a.push ''
								else
									a.last << t
								end
							end

							t = (0...m[:arguments].length).map do |i|
								[m[:arguments][i], (a[i] || '')]
							end.to_h

							t['__VA_ARGS__'] = a[t.length..-1].map { |e| ',' + e }.join

							partition.(Splitter.split(m[:body]).map { |e| (t[e] || e)}.join, n + 1)
						else
							done.push v
						end
					end
				else
					done.push v
				end
			}

			partition.(line, 0)

			until open.empty?
				resolve.(*open.shift)
			end

			parts = done

			if @comp
				line = Preprocessor.join(parts)
			else
				line = parts.join + "\n"
			end
			
			@content.push(line)
		end
	end

	def write(fn)
		File.open(fn, 'w') do |f|
			f.write(@content.join)
		end
	end

	def self.join(p)
		det = ->(s) {
			c = s[0]
			(((c >= 'a' and c <= 'z') or (c >= 'A' and c <= 'Z') or c == '_' or c == '$') ? 1 : ((c >= '0' and c <= '9')) ? 2 : 0) }

		p.reject! { |e| e.strip.empty? }

		return '' if p.empty?

		s = det.(p[0]);
		r = p.shift

		until p.empty?
			e = p.shift
			ss = det.(e)
			r += ' ' if s == 1 and ss > 0
			r += e
			s = ss
		end

		r
	end

	def self.uncomment(l)
		p = Splitter.split(l)
		l = ''

		until p.empty?
			e = p.shift

			if e == '/' and l[-1] == '/'
				l[-1] = ''
				break
			end

			l += e
		end

		l
	end

	def self.get_module(fn)
		File.open(fn, 'r') do |f|
			break if f.eof?

			l = f.readline
			
			return l.split(/[ \t]+/, 2)[1].strip if l.start_with? '//#module'
		end

		nil
	end
end


stub, mod = *Dir.glob('*.js').map { |fn| (m = Preprocessor.get_module(fn)) ? [fn, m] : nil }. find { |e| e }

if stub
	p = Preprocessor.new(mod, ARGV[0] == '--compressed')
	p.doInclude("\"#{stub}\"")
	p.write("#{mod}.js")

	puts "[#{Time.now}] Created module #{mod}"
else
	puts "ERR: Could not find any modules!"
end

