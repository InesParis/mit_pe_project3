clear all

% Initialize DSM
n      = 10;   % # components
d      = 2;    % # dependencies per component
method = 'odeg';
DSM    = init_DSM(n,d,method);  

% Export DSM to JSON
DSM_json = jsonencode(DSM);
fileID = fopen('c:\Users\ines.paris\OneDrive - Global Alumni\VS CODE\mit_pe_project3\dsm_data.json', 'w');
fprintf(fileID, DSM_json);
fclose(fileID);

% Compute theoretical cost evolution
t_plot = unique(round(10.^[0 : .05 : 7]'));
t0     = factorial(d+1) / (d^(d+2)) * n;
c_ave  = (t_plot/t0 + 1).^(-1/d);

% Export cost evolution to JSON
cost_data.time = t_plot;
cost_data.cost = c_ave;
cost_json = jsonencode(cost_data);
fileID = fopen('c:\Users\ines.paris\OneDrive - Global Alumni\VS CODE\mit_pe_project3\cost_data.json', 'w');
fprintf(fileID, cost_json);
fclose(fileID);

% Simulate DSM
% kmax   = 1000; % # of success to simulate
% tmax   = 1e8;  % max # of time steps to simulate
% [time,cost] = simulateRecipeModel(DSM,kmax,tmax);

% Plot
% fig_costEvolution

% GUI mode
if true
f    = openfig('RecipeGUI.fig');
data = guihandles(f); % Initialize data struct to contain handles for GUI.
data.n      = n;
data.d      = d;
data.method = method;
data.DSM    = DSM;
guidata(f, data);
end