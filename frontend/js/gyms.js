/**
 * FitCoach AI - Gym Finder Logic
 */

let map;
let userMarker;
let gymMarkers = [];
let userCoords = null;
let routingControl = null;
let activeGyms = [];
let lastSearchQuery = '';

// Major Indian cities with areas
const CITIES = {
    // Major Metro Cities
    'bangalore': { lat: 12.9716, lng: 77.5946, name: 'Bangalore', state: 'Karnataka', areas: ['MG Road', 'Koramangala', 'Indiranagar', 'Whitefield', 'Jayanagar', 'HSR Layout', 'Marathahalli', 'BTM Layout', 'JP Nagar', 'Banashankari'] },
    'mumbai': { lat: 19.0760, lng: 72.8777, name: 'Mumbai', state: 'Maharashtra', areas: ['Andheri', 'Bandra', 'Juhu', 'Colaba', 'Worli', 'Powai', 'Marine Drive', 'Dadar', 'Borivali', 'Vashi'] },
    'delhi': { lat: 28.7041, lng: 77.1025, name: 'Delhi', state: 'Delhi', areas: ['Connaught Place', 'Saket', 'Dwarka', 'Rohini', 'Lajpat Nagar', 'Karol Bagh', 'Rajouri Garden', 'Nehru Place', 'Mayur Vihar', 'Paharganj'] },
    'chennai': { lat: 13.0827, lng: 80.2707, name: 'Chennai', state: 'Tamil Nadu', areas: ['T Nagar', 'Anna Nagar', 'Mylapore', 'Nungambakkam', 'Adyar', 'Velachery', 'Porur', 'Mount Road', 'Besant Nagar', 'Kodambakkam'] },
    'hyderabad': { lat: 17.3850, lng: 78.4867, name: 'Hyderabad', state: 'Telangana', areas: ['Gachibowli', 'Banjara Hills', 'Jubilee Hills', 'Madhapur', 'Kukatpally', 'Ameerpet', 'Secunderabad', 'Hi Tech City', 'Begumpet', 'Kondapur'] },
    'kolkata': { lat: 22.5726, lng: 88.3639, name: 'Kolkata', state: 'West Bengal', areas: ['Park Street', 'Salt Lake', 'New Town', 'Ballygunge', 'Gariahat', 'Behala', 'Howrah', 'Baranagar', 'Dum Dum', 'Alipore'] },
    'pune': { lat: 18.5204, lng: 73.8567, name: 'Pune', state: 'Maharashtra', areas: ['Koregaon Park', 'Khadki', 'Viman Nagar', 'Shivaji Nagar', 'Aundh', 'Baner', 'Pashan', 'Kothrud', 'Sinhgad Road', 'Wakad'] },
    
    // Andhra Pradesh & Telangana
    'chittoor': { lat: 13.2172, lng: 79.1003, name: 'Chittoor', state: 'Andhra Pradesh', areas: ['Bus Stand', 'Temple Area', 'Market Road', 'Gandhi Road', 'Railway Station'] },
    'chittor': { lat: 13.2172, lng: 79.1003, name: 'Chittoor', state: 'Andhra Pradesh', areas: ['Bus Stand', 'Temple Area', 'Market Road', 'Gandhi Road', 'Railway Station'] },
    'visakhapatnam': { lat: 17.6868, lng: 83.2185, name: 'Visakhapatnam', state: 'Andhra Pradesh', areas: ['MVP Colony', 'Dwaraka Nagar', 'Gajuwaka', 'Beach Road', 'Kalinganagar'] },
    'vijayawada': { lat: 16.5062, lng: 80.6480, name: 'Vijayawada', state: 'Andhra Pradesh', areas: ['MG Road', 'Benz Circle', 'Governor Peta', 'Labbipet', 'Gandhi Nagar'] },
    'guntur': { lat: 16.3067, lng: 80.4365, name: 'Guntur', state: 'Andhra Pradesh', areas: ['Brodipet', 'Arundelpet', 'Lakshmipuram', 'Krishna Nagar'] },
    'tirupati': { lat: 13.6288, lng: 79.4191, name: 'Tirupati', state: 'Andhra Pradesh', areas: ['Tirumala Road', 'Chennai Road', 'Kapatrapuram', 'Ramanujapuram'] },
    'nellore': { lat: 14.4426, lng: 79.9865, name: 'Nellore', state: 'Andhra Pradesh', areas: ['Gandhi Nagar', 'Kota Centre', 'Potti Sreeramulu', 'Magunta Layout'] },
    'kurnool': { lat: 15.8281, lng: 78.0373, name: 'Kurnool', state: 'Andhra Pradesh', areas: ['Main Road', 'Kurnool City', 'Nandyal Road', 'Adoni Road'] },
    'kadapa': { lat: 14.4737, lng: 78.8244, name: 'Kadapa', state: 'Andhra Pradesh', areas: ['Madhavaram', 'RTC Colony', 'Yerraguntla', 'Proddatur Road'] },
    'rajahmundry': { lat: 16.9878, lng: 81.6911, name: 'Rajahmundry', state: 'Andhra Pradesh', areas: ['RT Road', 'Avenue Road', 'Kovur', 'Godavari Bridge'] },
    'eluru': { lat: 16.7104, lng: 81.0953, name: 'Eluru', state: 'Andhra Pradesh', areas: ['Gollapudi', 'Madhira Road', 'Eluru Town', 'Power Office'] },
    'anantapur': { lat: 14.6819, lng: 77.6006, name: 'Anantapur', state: 'Andhra Pradesh', areas: ['Anantapur Town', 'RTC Colony', 'Sai Nagar', 'Kalyan Durgam'] },
    'warangal': { lat: 17.9784, lng: 79.5941, name: 'Warangal', state: 'Telangana', areas: ['Kashipudi', 'Station Road', 'Mulugu Road', 'Hanamkonda'] },
    
    // Gujarat
    'ahmedabad': { lat: 23.0225, lng: 72.5714, name: 'Ahmedabad', state: 'Gujarat', areas: ['SG Highway', 'Prahlad Nagar', 'Satellite', 'Bodakdev', 'Thaltej', 'CG Road', 'Navrangpura', 'Vastrapur', 'Paldi', 'Maninagar'] },
    'surat': { lat: 21.1702, lng: 72.8311, name: 'Surat', state: 'Gujarat', areas: ['Adajan', 'Katargam', 'Varachha', 'Udhna', 'Majura Gate'] },
    'vadodara': { lat: 22.3072, lng: 73.1812, name: 'Vadodara', state: 'Gujarat', areas: ['Alkapuri', 'Fatehgunj', 'Sayajigunj', 'Manjalpur', 'Gotri'] },
    'rajkot': { lat: 22.3039, lng: 70.8022, name: 'Rajkot', state: 'Gujarat', areas: ['Kotecha Nagar', 'Madhapar', 'Gondal Road', 'Raiya Road', 'Kalawad Road'] },
    
    // Rajasthan
    'jaipur': { lat: 26.9124, lng: 75.7873, name: 'Jaipur', state: 'Rajasthan', areas: ['MI Road', 'C Scheme', 'Vaishali Nagar', 'Malviya Nagar', 'Raja Park', 'Bapu Nagar'] },
    'jodhpur': { lat: 26.2389, lng: 73.0243, name: 'Jodhpur', state: 'Rajasthan', areas: ['Sardarpura', 'Ratanada', 'Jhalawar Road', 'Paota', 'Mandore'] },
    'udaipur': { lat: 24.5854, lng: 73.7125, name: 'Udaipur', state: 'Rajasthan', areas: ['Fatehsagar', 'Lake Palace Road', 'Chandpole', 'Bhupalpura', 'Sukhadia Circle'] },
    
    // Uttar Pradesh
    'lucknow': { lat: 26.8467, lng: 80.9462, name: 'Lucknow', state: 'Uttar Pradesh', areas: ['Hazratganj', 'Gomti Nagar', 'Indiranagar', 'Alambagh', 'Aminabad', 'Mahanagar'] },
    'kanpur': { lat: 26.4499, lng: 80.3319, name: 'Kanpur', state: 'Uttar Pradesh', areas: ['Mall Road', 'Swaroop Nagar', 'Parade', 'Civil Lines', 'Kalyanpur'] },
    'varanasi': { lat: 25.3176, lng: 82.9739, name: 'Varanasi', state: 'Uttar Pradesh', areas: ['Lanka', 'Assi Ghat', 'Godowlia', 'Chandpur', 'Sigra'] },
    'agra': { lat: 27.1767, lng: 78.0081, name: 'Agra', state: 'Uttar Pradesh', areas: ['Tajganj', 'Sanj Place', 'Agra Cantt', 'Kamla Nagar', 'Shahganj'] },
    'meerut': { lat: 28.9845, lng: 77.7081, name: 'Meerut', state: 'Uttar Pradesh', areas: ['Pali', 'Shastri Nagar', 'Civil Lines', 'Medical Road', 'Ganga Nagar'] },
    
    // Madhya Pradesh
    'bhopal': { lat: 23.2599, lng: 77.4126, name: 'Bhopal', state: 'Madhya Pradesh', areas: ['MP Nagar', 'Arera Colony', 'Bawadia Kalan', 'Kolar Road', 'Shivaji Nagar'] },
    'indore': { lat: 22.7196, lng: 75.8577, name: 'Indore', state: 'Madhya Pradesh', areas: ['MG Road', 'Vijay Nagar', 'AB Road', 'Palasia', 'Rajendra Nagar'] },
    'jabalpur': { lat: 23.1815, lng: 79.9864, name: 'Jabalpur', state: 'Madhya Pradesh', areas: ['Napier Town', 'Sh和教育aram', 'Madan Mahal', 'Gwarighat', 'Wright Town'] },
    'gwalior': { lat: 26.2124, lng: 78.1772, name: 'Gwalior', state: 'Madhya Pradesh', areas: ['DB City', 'Lashkar', 'Tansen Nagar', 'Moti Mandi', 'Jayendra Ganj'] },
    
    // Kerala
    'kochi': { lat: 9.9312, lng: 76.2673, name: 'Kochi', state: 'Kerala', areas: ['MG Road', 'Marine Drive', 'Kaloor', 'Edappally', 'Vyttila', 'Panampilly Nagar'] },
    'thiruvananthapuram': { lat: 8.5241, lng: 76.9366, name: 'Thiruvananthapuram', state: 'Kerala', areas: ['MG Road', 'Kowdiar', 'Palayam', 'Nalanchira', 'Pattom'] },
    'kozhikode': { lat: 11.2588, lng: 75.7824, name: 'Kozhikode', state: 'Kerala', areas: ['Mavoor Road', 'Civil Station', 'Kuttichira', 'Puthiyara', 'Calicut Beach'] },
    
    // Punjab & Chandigarh
    'chandigarh': { lat: 30.7333, lng: 76.7794, name: 'Chandigarh', state: 'Punjab', areas: ['Sector 17', 'Sector 22', 'Sector 35', 'Sector 43', 'Mohali'] },
    'ludhiana': { lat: 30.9010, lng: 75.8573, name: 'Ludhiana', state: 'Punjab', areas: ['Ferozepur Road', 'Civil Lines', 'Model Town', 'Gill Road'] },
    'amritsar': { lat: 31.6340, lng: 74.8723, name: 'Amritsar', state: 'Punjab', areas: ['Golden Temple', 'Mall Road', 'Lawrence Road', 'Ranjit Avenue'] },
    'jalandhar': { lat: 31.3260, lng: 75.5765, name: 'Jalandhar', state: 'Punjab', areas: ['Model Town', 'Civil Lines', 'Bus Stand', 'Guru Nanak Nagar'] },
    
    // Haryana
    'gurugram': { lat: 28.4595, lng: 77.0266, name: 'Gurugram', state: 'Haryana', areas: ['DLF Phase 1-5', 'Sohna Road', 'Golf Course Road', 'MG Road', 'Sector 56'] },
    'faridabad': { lat: 28.4089, lng: 77.3178, name: 'Faridabad', state: 'Haryana', areas: ['Sector 15', 'Sector 16', 'Ballabgarh', 'NIT', 'Old Faridabad'] },
    'panipat': { lat: 29.3909, lng: 76.9685, name: 'Panipat', state: 'Haryana', areas: ['GT Road', 'Model Town', 'Khatri Road', 'Gohana Road'] },
    
    // Uttarakhand
    'dehradun': { lat: 30.3165, lng: 78.0322, name: 'Dehradun', state: 'Uttarakhand', areas: ['Clock Tower', 'Rajpur Road', 'Mussoorie Road', 'ISBT', 'Clement Town'] },
    'haridwar': { lat: 29.9457, lng: 78.1342, name: 'Haridwar', state: 'Uttarakhand', areas: ['Haridwar Main', 'Ranipur', 'Jwalapur', 'Bhupat Colony'] },
    'rishikesh': { lat: 30.0869, lng: 78.2676, name: 'Rishikesh', state: 'Uttarakhand', areas: ['Laxman Jhula', 'Tapovan', 'Rishikesh Main', 'Shivananda Nagar'] },
    
    // Bihar
    'patna': { lat: 25.5941, lng: 85.1376, name: 'Patna', state: 'Bihar', areas: ['Boring Road', 'Kankarbagh', 'Ashiana Nagar', 'Rajendra Nagar', 'Patliputra'] },
    'gaya': { lat: 24.7914, lng: 85.0078, name: 'Gaya', state: 'Bihar', areas: ['Gaya Town', 'Kadam Kuan', 'Shree Kunj', 'Mithapur'] },
    'muzaffarpur': { lat: 26.1209, lng: 85.3647, name: 'Muzaffarpur', state: 'Bihar', areas: ['Brahmpuri', 'Mithanagar', 'Juran Chhapra', 'Gandhi Maidan'] },
    
    // Jharkhand
    'ranchi': { lat: 23.3441, lng: 85.3095, name: 'Ranchi', state: 'Jharkhand', areas: ['Hinoo', 'Doranda', 'Kadru', 'Argora', 'Hatia'] },
    'jamshedpur': { lat: 22.8046, lng: 86.2029, name: 'Jamshedpur', state: 'Jharkhand', areas: ['Sakchi', 'Bistupur', 'Telco Colony', 'Kadma'] },
    'dhanbad': { lat: 23.7957, lng: 86.4304, name: 'Dhanbad', state: 'Jharkhand', areas: ['Bank More', 'Shastri Nagar', 'Hirak Road', 'Baharagora'] },
    
    // Odisha
    'bhubaneswar': { lat: 20.2961, lng: 85.8245, name: 'Bhubaneswar', state: 'Odisha', areas: ['Bapuji Nagar', 'Satya Nagar', 'Jayadev Vihar', 'Nayapalli', 'Patia'] },
    'cuttack': { lat: 20.4625, lng: 85.8828, name: 'Cuttack', state: 'Odisha', areas: ['Jobra', 'Choudhury Bazar', 'CDA Sector', 'Nayabazar'] },
    'rourkela': { lat: 22.2604, lng: 84.8536, name: 'Rourkela', state: 'Odisha', areas: ['Sector 19', 'Civil Township', 'Koel Nagar', 'Udit Nagar'] },
    'puri': { lat: 19.8125, lng: 85.8311, name: 'Puri', state: 'Odisha', areas: ['Grand Road', 'Marine Drive', 'Chakra Tirtha', 'Swargadwar'] },
    
    // Chhattisgarh
    'raipur': { lat: 21.2514, lng: 81.6298, name: 'Raipur', state: 'Chhattisgarh', areas: ['Pandri', 'Mowa', 'Civil Lines', 'Shankar Nagar', 'Dhamtari Road'] },
    'bilaspur': { lat: 22.0696, lng: 82.1407, name: 'Bilaspur', state: 'Chhattisgarh', areas: ['Link Road', 'Shiv Talkies', 'Tifra', 'BSP Colony'] },
    'durg': { lat: 21.1924, lng: 81.2855, name: 'Durg', state: 'Chhattisgarh', areas: ['Durg Town', 'Bhilai Road', 'Supela', 'Ratanpur'] },
    
    // Assam
    'guwahati': { lat: 26.1445, lng: 91.7362, name: 'Guwahati', state: 'Assam', areas: ['GS Road', 'Paltan Bazar', 'Pan Bazaar', 'Beltola', 'Dispur'] },
    'silchar': { lat: 24.8273, lng: 92.7979, name: 'Silchar', state: 'Assam', areas: ['Station Road', 'Amar Market', 'Singerbhil', 'Lakhipur'] },
    'dibrugarh': { lat: 27.4719, lng: 94.9081, name: 'Dibrugarh', state: 'Assam', areas: ['Chowk', 'Milan Path', 'Graham Bazar', 'Amguri'] },
    
    // Andhra Pradesh & Telangana
    'visakhapatnam': { lat: 17.6868, lng: 83.2185, name: 'Visakhapatnam', state: 'Andhra Pradesh', areas: ['MVP Colony', 'Dwaraka Nagar', 'Gajuwaka', 'Beach Road', 'Kalinganagar'] },
    'vijayawada': { lat: 16.5062, lng: 80.6480, name: 'Vijayawada', state: 'Andhra Pradesh', areas: ['MG Road', 'Benz Circle', 'Governor Peta', 'Labbipet', 'Gandhi Nagar'] },
    'guntur': { lat: 16.3067, lng: 80.4365, name: 'Guntur', state: 'Andhra Pradesh', areas: ['Brodipet', 'Arundelpet', 'Lakshmipuram', 'Krishna Nagar'] },
    'tirupati': { lat: 13.6288, lng: 79.4191, name: 'Tirupati', state: 'Andhra Pradesh', areas: ['Tirumala Road', 'Chennai Road', 'Kapatrapuram', 'Ramanujapuram'] },
    'nellore': { lat: 14.4426, lng: 79.9865, name: 'Nellore', state: 'Andhra Pradesh', areas: ['Gandhi Nagar', 'Kota Centre', 'Potti Sreeramulu', 'Magunta Layout'] },
    'rajahmundry': { lat: 16.9878, lng: 81.6911, name: 'Rajahmundry', state: 'Andhra Pradesh', areas: ['RT Road', 'Avenue Road', 'Kovur', 'Godavari Bridge'] },
    'kurnool': { lat: 15.8281, lng: 78.0373, name: 'Kurnool', state: 'Andhra Pradesh', areas: ['Main Road', 'Kurnool City', 'Nandyal Road', 'Adoni Road'] },
    'kadapa': { lat: 14.4737, lng: 78.8244, name: 'Kadapa', state: 'Andhra Pradesh', areas: ['Madhavaram', 'RTC Colony', 'Yerraguntla', 'Proddatur Road'] },
    'eluru': { lat: 16.7104, lng: 81.0953, name: 'Eluru', state: 'Andhra Pradesh', areas: ['Gollapudi', 'Madhira Road', 'Eluru Town', 'Power Office'] },
    'anantapur': { lat: 14.6819, lng: 77.6006, name: 'Anantapur', state: 'Andhra Pradesh', areas: ['Anantapur Town', 'RTC Colony', 'Sai Nagar', 'Kalyan Durgam'] },
    'warangal': { lat: 17.9784, lng: 79.5941, name: 'Warangal', state: 'Telangana', areas: ['Kashipudi', 'Station Road', 'Mulugu Road', 'Hanamkonda'] },
    'secunderabad': { lat: 17.4413, lng: 78.5029, name: 'Secunderabad', state: 'Telangana', areas: ['PG Road', 'Minister Road', 'Hill Fort', 'Krishna Nagar'] },
    
    // Tamil Nadu
    'coimbatore': { lat: 11.0168, lng: 76.9558, name: 'Coimbatore', state: 'Tamil Nadu', areas: ['RS Puram', 'Gandhipuram', 'Peelamedu', 'Singanallur', 'Vadavalli'] },
    'madurai': { lat: 9.9252, lng: 78.1198, name: 'Madurai', state: 'Tamil Nadu', areas: ['Anna Nagar', 'Simmakkal', 'Tatabad', 'Goripalayam'] },
    'tiruchirappalli': { lat: 10.7905, lng: 78.7047, name: 'Tiruchirappalli', state: 'Tamil Nadu', areas: ['Rockfort', 'Srirangam', 'Thillai Nagar', 'Pazhavangadi'] },
    'salem': { lat: 11.6643, lng: 78.1460, name: 'Salem', state: 'Tamil Nadu', areas: ['Gugai', 'Fairlands', 'Hasthampatti', 'Omalur Road'] },
    'tiruppur': { lat: 11.1085, lng: 77.3411, name: 'Tiruppur', state: 'Tamil Nadu', areas: ['Town Hall', 'Dhakshina', 'Kangeyam Road', 'Avinashi Road'] },
    'vellore': { lat: 12.9165, lng: 79.1325, name: 'Vellore', state: 'Tamil Nadu', areas: ['Anna Nagar', 'Katpadi', 'Sathuvachari', 'Virudhunagar Road'] },
    'erode': { lat: 11.3410, lng: 77.7172, name: 'Erode', state: 'Tamil Nadu', areas: ['Gandhi Nagar', 'Perundurai Road', 'KST Colony', 'Sampath Nagar'] },
    'thoothukudi': { lat: 8.7642, lng: 78.1348, name: 'Thoothukudi', state: 'Tamil Nadu', areas: ['Cooke Town', 'Thoothukudi Main', 'Otterpally', 'Muthuramalingam'] },
    'tirunelveli': { lat: 8.7139, lng: 77.7567, name: 'Tirunelveli', state: 'Tamil Nadu', areas: ['Palayamkottai', 'Thachanallur', 'Nallur', 'Melapalayam'] },
    
    // Karnataka other cities
    'mysore': { lat: 12.2958, lng: 76.6394, name: 'Mysore', state: 'Karnataka', areas: ['Ring Road', 'Sayyaji Rao Road', 'KRS Road', 'Vijayanagar', 'Sadashivanagar'] },
    'mangalore': { lat: 12.9141, lng: 74.8560, name: 'Mangalore', state: 'Karnataka', areas: ['Balmatta', 'Kadri', 'Mangalore City', 'Kottara', 'Surathkal'] },
    'hubli': { lat: 15.3647, lng: 75.1249, name: 'Hubli', state: 'Karnataka', areas: ['Gandhi Chowk', 'Court Road', 'Deshpande Nagar', 'Shirur Park'] },
    
    // Maharashtra other cities
    'nagpur': { lat: 21.1458, lng: 79.0882, name: 'Nagpur', state: 'Maharashtra', areas: ['Sitabuldi', 'Mahatma Road', 'Dharampeth', 'Sadar', 'Jaripatka'] },
    'nashik': { lat: 19.9975, lng: 73.7898, name: 'Nashik', state: 'Maharashtra', areas: ['MG Road', 'College Road', 'Panchavati', 'Cidco', 'Nashik Road'] },
    'aurangabad': { lat: 19.8762, lng: 75.3433, name: 'Aurangabad', state: 'Maharashtra', areas: ['CIDCO', 'Jalna Road', 'Padampura', 'Kranti Chowk'] },
    
    // Goa
    'panaji': { lat: 15.4907, lng: 73.8272, name: 'Panaji', state: 'Goa', areas: ['MG Road', 'Campal', 'Panjim City', 'Altinho', 'Ribandar'] },
    'margao': { lat: 15.2834, lng: 73.9854, name: 'Margao', state: 'Goa', areas: ['Margao Town', 'Benaulim', 'Colva', 'Cortalim', 'Navelim'] },
    'vasco': { lat: 15.3887, lng: 73.8323, name: 'Vasco da Gama', state: 'Goa', areas: ['Vasco Town', 'Mormugao', 'Dabolim', 'Sada', 'Chicalim'] },
    
    // Himachal Pradesh
    'shimla': { lat: 31.1048, lng: 77.1734, name: 'Shimla', state: 'Himachal Pradesh', areas: ['Mall Road', 'The Ridge', 'Chhota Shimla', 'Kasaruli', 'Summer Hill'] },
    'dharamshala': { lat: 32.2190, lng: 76.3161, name: 'Dharamshala', state: 'Himachal Pradesh', areas: ['Mcleodganj', 'Dharamshala Town', 'Kangra', 'Palampur Road'] },
    'mandi': { lat: 31.7087, lng: 76.9317, name: 'Mandi', state: 'Himachal Pradesh', areas: ['Mandi Town', 'Bhutti Colony', 'Rewalsar', 'Sarkaghat'] },
    'solan': { lat: 30.9045, lng: 77.0820, name: 'Solan', state: 'Himachal Pradesh', areas: ['Solan Town', 'Kumarhatti', 'Barog', 'Chakli', 'Salogra'] },
    
    // Puducherry
    'pondicherry': { lat: 11.9416, lng: 79.8083, name: 'Pondicherry', state: 'Puducherry', areas: ['White Town', 'MG Road', 'Aurobindo Street', 'Mahatma Gandhi Road'] },
};

const GYM_NAMES = [
    'Gold\'s Gym', 'Fit4Life', 'Power Gym', 'Flex Fitness', 'Muscle Factory',
    'Crunch Fitness', 'Anytime Fitness', 'Cult.fit', 'Talwalkars', 'Snap Fitness',
    'Planet Fitness', 'Fitness First', 'Equinox', 'Smart Fit', 'Iron Gym'
];

const GYM_IMAGES = [
    "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=400",
    "https://images.unsplash.com/photo-1518611012118-2965c72c91a3?w=400",
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400",
    "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400",
    "https://images.unsplash.com/photo-1593079350384-ad4b9868be41?w=400"
];

document.addEventListener('DOMContentLoaded', function() {
    initMap();
    setupEventListeners();
    // Auto-detect user location
    detectUserLocation();
});

function detectUserLocation() {
    updateLocationStatus("📍 DETECTING LOCATION...");
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                var lat = position.coords.latitude;
                var lng = position.coords.longitude;
                userCoords = [lat, lng];
                
                // Try to get city name from coordinates
                updateLocationStatus("📍 YOUR LOCATION");
                moveToLocation(lat, lng);
                showGymsNearLocation(lat, lng);
            },
            function(error) {
                // Show message to search manually
                updateLocationStatus("📍 ENABLE LOCATION OR SEARCH");
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        updateLocationStatus("📍 SEARCH A CITY");
    }
}

function showGymsNearLocation(lat, lng) {
    // Try to find closest city from coordinates
    var city = findClosestCity(lat, lng);
    if (city) {
        lastSearchQuery = city.key;
        updateLocationStatus("📍 " + city.name.toUpperCase());
        showGymsForCity(city);
    } else {
        // Fetch real gyms from Overpass API
        fetchRealGyms(lat, lng, "Your Location");
    }
}

function fetchRealGyms(lat, lng, locationName) {
    updateLocationStatus("🔍 FINDING REAL GYMS...");
    
    var radius = 10000; // 10km radius
    var query = '[out:json][timeout:25];' +
        '(nwr["leisure"="fitness_centre"](around:' + radius + ',' + lat + ',' + lng + ');' +
        'nwr["leisure"="gym"](around:' + radius + ',' + lat + ',' + lng + ');' +
        'nwr["amenity"="gym"](around:' + radius + ',' + lat + ',' + lng + ');' +
        'nwr["name"~"Gym|Fitness",i](around:' + radius + ',' + lat + ',' + lng + '););' +
        'out center;';
    
    var url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);
    
    fetch(url)
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.elements && data.elements.length > 0) {
                var gyms = data.elements.map(function(element) {
                    var gymLat = element.center ? element.center.lat : lat;
                    var gymLng = element.center ? element.center.lon : lng;
                    
                    var address = "Nearby";
                    if (element.tags) {
                        var addr = element.tags;
                        var parts = [];
                        if (addr['addr:housenumber']) parts.push(addr['addr:housenumber']);
                        if (addr['addr:street']) parts.push(addr['addr:street']);
                        if (addr['addr:city']) parts.push(addr['addr:city']);
                        if (parts.length > 0) address = parts.join(', ');
                    }
                    
                    return {
                        id: element.id,
                        name: element.tags.name || "Fitness Center",
                        coords: [gymLat, gymLng],
                        distance: calculateDistance(lat, lng, gymLat, gymLng),
                        rating: element.tags.rating ? parseFloat(element.tags.rating).toFixed(1) : (3.5 + Math.random() * 1).toFixed(1),
                        reviews: element.tags.rating ? Math.floor(Math.random() * 100 + 10) : Math.floor(Math.random() * 200 + 5),
                        address: address,
                        open_hours: element.tags.opening_hours || "Contact for hours",
                        is24h: element.tags.opening_hours ? element.tags.opening_hours.toLowerCase().includes("24") : false,
                        isPremium: false,
                        isWomenOnly: element.tags.female === "yes",
                        image: GYM_IMAGES[Math.floor(Math.random() * GYM_IMAGES.length)],
                        phone: element.tags.phone || ""
                    };
                });
                
                gyms.sort(function(a, b) { return a.distance - b.distance; });
                activeGyms = gyms.slice(0, 20); // Limit to 20
                renderResults(activeGyms);
                updateLocationStatus("📍 " + activeGyms.length + " REAL GYMS FOUND");
            } else {
                // No real gyms found - use mock gyms as fallback
                var city = findClosestCity(lat, lng);
                if (city) {
                    var mockGyms = generateGyms(CITIES[city.key], lat, lng);
                    activeGyms = mockGyms;
                    renderResults(activeGyms);
                    updateLocationStatus("📍 " + mockGyms.length + " GYMS FOUND (Area Data)");
                } else {
                    var fallbackGyms = generateGymsForCoords(lat, lng);
                    activeGyms = fallbackGyms;
                    renderResults(activeGyms);
                    updateLocationStatus("📍 " + fallbackGyms.length + " GYMS FOUND");
                }
            }
        })
        .catch(function(err) {
            console.error("Error fetching gyms:", err);
            // Fallback to mock gyms on error
            var city = findClosestCity(lat, lng);
            if (city && CITIES[city.key]) {
                var mockGyms = generateGyms(CITIES[city.key], lat, lng);
                activeGyms = mockGyms;
                renderResults(activeGyms);
                updateLocationStatus("📍 " + mockGyms.length + " GYMS FOUND");
            } else {
                var fallbackGyms = generateGymsForCoords(lat, lng);
                activeGyms = fallbackGyms;
                renderResults(activeGyms);
                updateLocationStatus("📍 " + fallbackGyms.length + " GYMS FOUND");
            }
        });
}

function findClosestCity(lat, lng) {
    var closestCity = null;
    var minDist = Infinity;
    
    for (var key in CITIES) {
        var city = CITIES[key];
        var dist = Math.sqrt(Math.pow(lat - city.lat, 2) + Math.pow(lng - city.lng, 2));
        if (dist < minDist) {
            minDist = dist;
            closestCity = { key: key, name: city.name, state: city.state, lat: city.lat, lng: city.lng, areas: city.areas };
        }
    }
    
    // Only use if within reasonable distance (~100km)
    if (minDist < 1.5) { // roughly 1.5 degrees
        return closestCity;
    }
    return null;
}

function generateGymsForCoords(centerLat, centerLng) {
    var gyms = [];
    var areaNames = ['Main Road', 'City Center', 'Market Road', 'Station Road', 'Bus Stand', 'Temple Area', 'Colony', 'Nagar', 'Sector', 'Phase'];
    
    for (var i = 0; i < 15; i++) {
        var latOffset = (Math.random() - 0.5) * 0.04;
        var lngOffset = (Math.random() - 0.5) * 0.04;
        var area = areaNames[Math.floor(Math.random() * areaNames.length)];
        
        gyms.push({
            id: i,
            name: GYM_NAMES[Math.floor(Math.random() * GYM_NAMES.length)],
            coords: [centerLat + latOffset, centerLng + lngOffset],
            distance: calculateDistance(centerLat, centerLng, centerLat + latOffset, centerLng + lngOffset),
            rating: (3.5 + Math.random() * 1.5).toFixed(1),
            reviews: Math.floor(Math.random() * 500) + 10,
            address: area + ", Nearby",
            open_hours: Math.random() > 0.3 ? "6AM - 10PM" : "24 Hours",
            is24h: Math.random() > 0.8,
            isPremium: Math.random() > 0.7,
            isWomenOnly: Math.random() > 0.9,
            image: GYM_IMAGES[i % GYM_IMAGES.length],
            phone: "+91 98765 43210"
        });
    }
    return gyms.sort(function(a, b) { return a.distance - b.distance; });
}

function initMap() {
    map = L.map('map', { zoomControl: true, attributionControl: true })
        .setView([20.5937, 78.9629], 5);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(map);
    
    // Setup address autocomplete
    setupAddressAutocomplete();
}

function setupAddressAutocomplete() {
    var searchInput = document.getElementById('gym-search');
    var timeout = null;
    
    searchInput.addEventListener('input', function() {
        var query = this.value.trim();
        if (query.length < 3) return;
        
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            searchAddress(query);
        }, 300);
    });
}

var addressResults = [];

function searchAddress(query) {
    var container = document.getElementById('address-results');
    if (!container) {
        container = document.createElement('div');
        container.id = 'address-results';
        container.style.cssText = 'position: absolute; top: 100%; left: 0; right: 0; background: #1a1a2e; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; margin-top: 5px; max-height: 200px; overflow-y: auto; z-index: 1001;';
        document.querySelector('.search-inner').appendChild(container);
    }
    
    container.innerHTML = '<div style="padding: 10px; color: #888; font-size: 0.8rem;">Searching...</div>';
    container.style.display = 'block';
    
    // Add India to query for better results
    var searchQuery = query;
    if (query.toLowerCase().indexOf('india') === -1) {
        searchQuery = query + ', India';
    }
    
    fetch('https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=' + encodeURIComponent(searchQuery))
        .then(function(response) { return response.json(); })
        .then(function(data) {
            addressResults = data;
            if (data.length === 0) {
                container.innerHTML = '<div style="padding: 10px; color: #888; font-size: 0.8rem;">No results found</div>';
                return;
            }
            
            container.innerHTML = '';
            data.forEach(function(item, index) {
                var div = document.createElement('div');
                div.style.cssText = 'padding: 10px; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem; color: #fff;';
                div.innerHTML = item.display_name.split(',').slice(0, 4).join(', ');
                div.onclick = function() { selectAddress(index); };
                container.appendChild(div);
            });
        })
        .catch(function(err) {
            container.innerHTML = '<div style="padding: 10px; color: #888; font-size: 0.8rem;">Search error</div>';
        });
}

function selectAddress(index) {
    var item = addressResults[index];
    var container = document.getElementById('address-results');
    if (container) container.style.display = 'none';
    
    document.getElementById('gym-search').value = item.display_name.split(',').slice(0, 3).join(', ');
    
    var lat = parseFloat(item.lat);
    var lng = parseFloat(item.lon);
    
    userCoords = [lat, lng];
    map.flyTo([lat, lng], 15, { duration: 1.5 });
    
    var address = item.address;
    var locationName = address.city || address.town || address.village || address.county || address.state || 'Location';
    updateLocationStatus("📍 " + locationName.toUpperCase());
    
    moveToLocation(lat, lng);
    showGymsNearLocation(lat, lng);
}

function handleSearch() {
    var query = document.getElementById('gym-search').value.trim();
    if (!query) {
        updateLocationStatus("⚠️ ENTER AN ADDRESS");
        return;
    }
    
    // Hide autocomplete
    var container = document.getElementById('address-results');
    if (container) container.style.display = 'none';
    
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }

    updateLocationStatus("🔍 SEARCHING...");

    // Try to find exact match first
    var cityKey = null;
    var lowerQuery = query.toLowerCase();
    for (var key in CITIES) {
        if (lowerQuery.indexOf(key) !== -1) {
            cityKey = key;
            break;
        }
    }

    if (cityKey) {
        searchCity(cityKey);
    } else {
        // Use Nominatim to geocode any address
        searchAddress(query);
    }
}

function setupEventListeners() {
    document.getElementById('gym-search').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            var container = document.getElementById('address-results');
            if (container && container.style.display === 'block' && addressResults.length > 0) {
                selectAddress(0);
            } else {
                handleSearch();
            }
        }
    });
    
    // Hide autocomplete when clicking outside
    document.addEventListener('click', function(e) {
        var container = document.getElementById('address-results');
        var searchInput = document.getElementById('gym-search');
        if (container && !e.target.closest('.search-inner')) {
            container.style.display = 'none';
        }
    });
    
    setupFilters();
}

function handleSearch() {
    var query = document.getElementById('gym-search').value.trim();
    if (!query) {
        updateLocationStatus("⚠️ ENTER AN ADDRESS");
        return;
    }
    
    // Hide autocomplete
    var container = document.getElementById('address-results');
    if (container) container.style.display = 'none';

    lastSearchQuery = query.toLowerCase();
    
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }

    updateLocationStatus("🔍 SEARCHING...");

    // Check if it's a known city
    var cityKey = null;
    var lowerQuery = query.toLowerCase();
    for (var key in CITIES) {
        if (lowerQuery.indexOf(key) !== -1) {
            cityKey = key;
            break;
        }
    }

    if (cityKey) {
        searchCity(cityKey);
    } else {
        // Use Nominatim for detailed address search
        searchAddress(query);
    }
}

function showLocationNotFound(query) {
    document.getElementById('gym-list').innerHTML = 
        '<div style="padding: 40px; text-align: center; color: #888; width: 100%;">' +
        '<div style="font-size: 2.5rem; margin-bottom: 15px;">🔍</div>' +
        '<p style="font-size: 1.1rem; font-weight: 600;">Location not found</p>' +
        '<p style="font-size: 0.85rem; opacity: 0.7;">Try a different city name</p>' +
        '<p style="font-size: 0.8rem; opacity: 0.5; margin-top: 15px;">Examples: Chennai, Mumbai, Delhi, Hyderabad, Pune, etc.</p>' +
        '</div>';
    
    // Clear markers
    gymMarkers.forEach(function(m) { map.removeLayer(m); });
    gymMarkers = [];
    activeGyms = [];
    
    updateLocationStatus("❌ NOT FOUND: " + query.toUpperCase());
}

function searchCity(cityKey) {
    var city = CITIES[cityKey];
    if (!city) return;

    userCoords = [city.lat, city.lng];
    lastSearchQuery = cityKey;
    map.flyTo([city.lat, city.lng], 13, { duration: 1.5 });
    updateLocationStatus("📍 " + city.name.toUpperCase());
    moveToLocation(city.lat, city.lng);
    showGymsForCity(city);
}

function quickSearch(city) {
    document.getElementById('gym-search').value = city;
    searchCity(city.toLowerCase());
}

function showGymsForCity(city) {
    // Try to fetch real gyms first
    fetchRealGyms(city.lat, city.lng, city.name);
}

function generateGyms(city, centerLat, centerLng) {
    var gyms = [];
    for (var i = 0; i < 15; i++) {
        var latOffset = (Math.random() - 0.5) * 0.04;
        var lngOffset = (Math.random() - 0.5) * 0.04;
        var area = city.areas[Math.floor(Math.random() * city.areas.length)];
        
        gyms.push({
            id: i,
            name: GYM_NAMES[Math.floor(Math.random() * GYM_NAMES.length)],
            coords: [centerLat + latOffset, centerLng + lngOffset],
            distance: calculateDistance(centerLat, centerLng, centerLat + latOffset, centerLng + lngOffset),
            rating: (3.5 + Math.random() * 1.5).toFixed(1),
            reviews: Math.floor(Math.random() * 500) + 10,
            address: area + ", " + city.name + ", " + city.state,
            open_hours: Math.random() > 0.3 ? "6AM - 10PM" : "24 Hours",
            is24h: Math.random() > 0.8,
            isPremium: Math.random() > 0.7,
            isWomenOnly: Math.random() > 0.9,
            image: GYM_IMAGES[i % GYM_IMAGES.length],
            phone: "+91 98765 43210"
        });
    }
    return gyms.sort(function(a, b) { return a.distance - b.distance; });
}

function moveToLocation(lat, lng) {
    if (userMarker) map.removeLayer(userMarker);
    
    var userIcon = L.divIcon({
        className: 'user-marker',
        html: '<div style="width: 20px; height: 20px; background: #00f0ff; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 15px #00f0ff;"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map).bindPopup("📍 Your Location");
}

function updateLocationStatus(text) {
    var el = document.getElementById('location-status');
    if (el) el.innerText = text;
}

function renderResults(gyms) {
    renderGymMarkers(gyms);
    renderGymList(gyms);
}

function renderGymMarkers(gyms) {
    gymMarkers.forEach(function(m) { map.removeLayer(m); });
    gymMarkers = [];

    gyms.forEach(function(gym) {
        var gymIcon = L.divIcon({
            className: 'gym-marker',
            html: '<div style="width: 35px; height: 35px; background: linear-gradient(135deg, #7000ff, #00f0ff); border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; box-shadow: 0 4px 15px rgba(112,0,255,0.5);">💪</div>',
            iconSize: [35, 35],
            iconAnchor: [17, 35]
        });

        var marker = L.marker(gym.coords, { icon: gymIcon }).addTo(map);
        
        marker.bindPopup(
            '<div style="font-family: sans-serif; min-width: 200px; color: #000;">' +
            '<b style="font-size: 1.1rem;">' + gym.name + '</b><br>' +
            '<span style="color: #fbbf24;">★ ' + gym.rating + '</span> <span style="color: #666; font-size: 0.8rem;">(' + gym.reviews + ')</span><br>' +
            '<p style="font-size: 0.8rem; margin: 5px 0; color: #444;">' + gym.address + '</p>' +
            '<p style="font-size: 0.75rem; margin: 3px 0; color: #22c55e;">🕐 ' + gym.open_hours + '</p>' +
            '<div style="display: flex; gap: 5px; margin-top: 10px;">' +
            '<button onclick="calculateRoute(' + gym.coords[0] + ', ' + gym.coords[1] + ')" style="background: #7000ff; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; flex: 1; font-size: 0.75rem;">ROUTE</button>' +
            '<button onclick="openGoogleMaps(' + gym.coords[0] + ', ' + gym.coords[1] + ')" style="background: #22c55e; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.75rem;">MAPS</button>' +
            '</div></div>'
        );
        
        gymMarkers.push(marker);
    });
}

function renderGymList(gyms) {
    var container = document.getElementById('gym-list');
    container.innerHTML = '';

    gyms.forEach(function(gym) {
        var card = document.createElement('div');
        card.className = 'gym-card';
        card.style.cssText = 'background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 15px; display: flex; gap: 15px; cursor: pointer; transition: all 0.2s ease;';
        
        card.innerHTML = 
            '<img src="' + gym.image + '" alt="' + gym.name + '" style="width: 80px; height: 80px; border-radius: 15px; object-fit: cover;">' +
            '<div style="flex: 1; min-width: 0;">' +
            '<h3 style="font-size: 1rem; margin: 0 0 4px 0; font-weight: 800; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">' + gym.name + '</h3>' +
            '<p style="font-size: 0.75rem; color: #888; margin: 0 0 6px 0; line-height: 1.3;">' + gym.address + '</p>' +
            '<div style="display: flex; align-items: center; gap: 10px; font-size: 0.8rem;">' +
            '<span style="color: #fbbf24; font-weight: 700;">★ ' + gym.rating + '</span>' +
            '<span style="color: #00f0ff; font-weight: 700;">' + gym.distance.toFixed(1) + ' km</span>' +
            '</div>' +
            '<div style="margin-top: 6px; display: flex; justify-content: space-between; align-items: center;">' +
            '<span style="font-size: 0.7rem; padding: 2px 8px; border-radius: 6px; background: rgba(34, 197, 94, 0.15); color: #22c55e; font-weight: 700;">' + gym.open_hours + '</span>' +
            '</div>' +
            '</div>';

        card.addEventListener('click', function() {
            map.flyTo(gym.coords, 16, { duration: 1 });
            var m = gymMarkers.find(function(marker) { return marker.getLatLng().lat === gym.coords[0]; });
            if (m) m.openPopup();
        });

        var btnContainer = document.createElement('div');
        btnContainer.style.cssText = 'display: flex; gap: 5px; margin-top: 8px;';
        
        var routeBtn = document.createElement('button');
        routeBtn.innerHTML = 'ROUTE';
        routeBtn.style.cssText = 'background: #7000ff; color: white; border: none; padding: 5px 10px; border-radius: 8px; font-size: 0.65rem; font-weight: 700; cursor: pointer;';
        routeBtn.onclick = function(e) {
            e.stopPropagation();
            calculateRoute(gym.coords[0], gym.coords[1]);
        };

        var navBtn = document.createElement('button');
        navBtn.innerHTML = 'MAPS';
        navBtn.style.cssText = 'background: #22c55e; color: white; border: none; padding: 5px 10px; border-radius: 8px; font-size: 0.65rem; font-weight: 700; cursor: pointer;';
        navBtn.onclick = function(e) {
            e.stopPropagation();
            openGoogleMaps(gym.coords[0], gym.coords[1]);
        };
        
        btnContainer.appendChild(routeBtn);
        btnContainer.appendChild(navBtn);
        card.querySelector('div').appendChild(btnContainer);

        container.appendChild(card);
    });
}

function calculateRoute(targetLat, targetLng) {
    if (!userCoords) {
        alert("Please search for a location first");
        return;
    }

    if (routingControl) map.removeControl(routingControl);

    routingControl = L.Routing.control({
        waypoints: [
            L.latLng(userCoords[0], userCoords[1]),
            L.latLng(targetLat, targetLng)
        ],
        lineOptions: {
            styles: [{ color: '#7000ff', weight: 5, opacity: 0.8 }]
        },
        createMarker: function() { return null; },
        addWaypoints: false,
        routeWhileDragging: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        showAlternatives: false
    }).addTo(map);

    var container = routingControl.getContainer();
    container.style.display = 'none';

    updateLocationStatus("🏁 ROUTE ACTIVE");
}

function openGoogleMaps(lat, lng) {
    var url = "https://www.google.com/maps/search/?api=1&query=" + lat + "," + lng;
    window.open(url, '_blank');
}

function setupFilters() {
    var chips = document.querySelectorAll('.filter-chip');
    chips.forEach(function(chip) {
        chip.addEventListener('click', function() {
            chips.forEach(function(c) { c.classList.remove('active'); });
            chip.classList.add('active');
            applyFilter(chip.innerText);
        });
    });
}

function applyFilter(type) {
    var filtered = activeGyms.slice();

    if (type === "24 Hours") filtered = filtered.filter(function(g) { return g.is24h; });
    else if (type === "Premium") filtered = filtered.filter(function(g) { return g.isPremium; });
    else if (type === "Women Only") filtered = filtered.filter(function(g) { return g.isWomenOnly; });

    renderResults(filtered);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg) { return deg * (Math.PI / 180); }

function reCenter() {
    detectUserLocation();
}
